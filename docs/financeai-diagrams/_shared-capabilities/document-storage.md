# Shared Capability — Document Storage

S3-compatible blob storage with SHA256 deduplication, metadata, and lifecycle policies.

## Architecture

```mermaid
flowchart TB
    Caller[Any module] --> API[FileService API]
    API --> Hash[Compute SHA256]
    Hash --> Dedup{Hash exists?}
    Dedup -->|Yes| Reuse[Return existing FileRef]
    Dedup -->|No| Upload[Upload to S3/MinIO]
    Upload --> Store[Store FileRef row]
    Store --> Return[Return FileRef ID]
    Reuse --> Return

    Return --> Module[Module stores FileRef ID]

    subgraph S3["S3 / MinIO"]
        Bucket[bills/]
        Bucket2[invoices/]
        Bucket3[evidence/]
        Bucket4[exports/]
        Bucket5[contracts/]
    end

    Upload --> Bucket
    Upload --> Bucket2
    Upload --> Bucket3
    Upload --> Bucket4
    Upload --> Bucket5

    classDef api fill:#e8f5e9,stroke:#388e3c
    classDef store fill:#f3e5f5,stroke:#7b1fa2
    class API,Hash,Dedup,Upload,Store api
    class Bucket,Bucket2,Bucket3,Bucket4,Bucket5 store
```

## FileRef Schema

```mermaid
erDiagram
    FileRef ||--o{ Expense : "attached to"
    FileRef ||--o{ Invoice : "attached to"
    FileRef ||--o{ VendorContract : "stored as"
    FileRef ||--o{ ApprovalEvidence : "evidence for"
    FileRef ||--o{ ReportRun : "output of"

    FileRef {
        uuid id PK
        string sha256 UK
        string bucket
        string key
        bigint size_bytes
        string mime_type
        string original_filename
        timestamp uploaded_at
        uuid uploaded_by FK
        string storage_class
        date archive_after
        date delete_after
    }
```

## Access Patterns

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Storage as FileService
    participant S3

    User->>API: GET /files/{file_ref_id}
    API->>API: Authorize (RBAC + thread membership)
    API->>Storage: Get presigned URL
    Storage->>S3: Generate presigned URL (15 min TTL)
    S3-->>Storage: URL
    Storage-->>API: URL
    API-->>User: Redirect or return URL
    User->>S3: Direct download (presigned)
```

## Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Hot: Just uploaded
    Hot --> Warm: > 1 year old
    Warm --> Cold: > 3 years old
    Cold --> Purged: > 7 years (statutory limit)
    Purged --> [*]

    Hot --> Hot: Active record references
    Warm --> Hot: Re-accessed
```

Storage class transitions are managed via S3 lifecycle rules in production, and via a Celery beat task in hackathon (mock).

## Security

- **At rest**: SSE-S3 encryption (AES-256)
- **In transit**: TLS 1.2+
- **Access**: presigned URLs only, never direct bucket access
- **TTL**: 15 minutes on download URLs
- **Audit**: every download is logged
- **Bucket policies**: deny public access at the bucket level
