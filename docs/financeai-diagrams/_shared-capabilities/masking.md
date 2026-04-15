# Shared Capability — Masking Middleware

The single chokepoint for all data leaving 3SC's network bound for third-party APIs (primarily Claude). This is the ISO 27001 / SOC 2 control point.

## Architecture

```mermaid
flowchart TB
    Caller[Any service<br/>OCR, Anomaly, NLQ, Forecast, Summary] --> Mask[MaskingMiddleware]

    subgraph Mask_Internal["MaskingMiddleware"]
        Schema[Field schema registry]
        Tokenize[Tokenizer]
        Bucket[Bucketizer]
        Strip[PII stripper]
        Roundtrip[Token map for unmask]
    end

    Mask --> Schema
    Schema --> Tokenize
    Schema --> Bucket
    Schema --> Strip
    Tokenize --> Roundtrip

    Mask --> Mapped[Masked payload]
    Mapped --> Claude[Claude API]
    Claude --> Resp[Response with tokens]
    Resp --> Unmask[Unmask via Roundtrip map]
    Unmask --> Caller

    classDef sec fill:#ffebee,stroke:#c62828,stroke-width:3px
    classDef proc fill:#e8f5e9,stroke:#388e3c
    class Mask,Schema,Tokenize,Bucket,Strip,Roundtrip,Unmask sec
    class Mapped,Resp proc
```

## Field-Level Masking Strategy

```mermaid
flowchart LR
    Field[Input field] --> Type{Type}
    Type -->|Vendor name| Tok[Tokenize → vendor_token_x7f]
    Type -->|GSTIN| Tok2[Tokenize → gstin_token_a3]
    Type -->|PAN| Strip2[Strip entirely]
    Type -->|Bank account| Strip3[Strip entirely]
    Type -->|Amount| Buck[Bucket → 50k_100k]
    Type -->|Description| Pass[Pass through<br/>strip names if present]
    Type -->|Internal note| Strip4[Strip entirely]
    Type -->|Email| Tok3[Tokenize → email_token_b9]
    Type -->|Date| Pass2[Pass through]
```

## Token Roundtrip

```mermaid
sequenceDiagram
    participant Caller
    participant Mask
    participant Claude

    Caller->>Mask: process(data)
    Mask->>Mask: For each field, tokenize and store map
    Mask->>Claude: Send masked data
    Claude-->>Mask: Response containing tokens
    Mask->>Mask: For each token in response, lookup map
    Mask-->>Caller: Unmasked response
    Mask->>Mask: Discard token map (in-memory only)
```

The token map is **never persisted**. It exists only for the lifetime of one Claude call. Tokens are not reused across calls.

## What Gets Sent to Claude — Concrete Example

### Original (in 3SC system)
```json
{
  "vendor_name": "Acme Logistics Pvt Ltd",
  "gstin": "29ABCDE1234F1Z5",
  "amount": 247500.00,
  "description": "Transportation services Mumbai to Pune",
  "bank_account": "1234567890123",
  "submitted_by": "rahul.sharma@3sc.in"
}
```

### Sent to Claude
```json
{
  "vendor_name": "vendor_token_a8f3",
  "gstin": "gstin_token_002",
  "amount_bucket": "200k_300k",
  "description": "Transportation services Mumbai to Pune",
  "submitted_by": "user_token_004"
}
```

`bank_account` is stripped entirely. `amount` is bucketed. Names are tokenized.

### Claude's Response
```text
Anomaly score: 0.15 (low). Vendor vendor_token_a8f3 has consistent submission pattern. Amount in 200k-300k bucket aligns with prior 6 bills.
```

### Unmasked for User Display
```text
Anomaly score: 0.15 (low). Vendor Acme Logistics Pvt Ltd has consistent submission pattern. Amount in 200k-300k bucket aligns with prior 6 bills.
```

## Compliance Properties

1. **No PII leaves the network** — verified by integration tests
2. **Single chokepoint** — no service may call Claude directly
3. **Audit logged** — every Claude call logs `(caller, fields_sent, timestamp)` minus content
4. **Reviewable** — security team can grep for `claude_client.call(` and find only one place: the masking service
