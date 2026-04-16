# System Architecture Diagrams

## Diagram 1: High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  React SPA ──┐  ┌─────────────────────────────────────┐    │
│              │  │ CFO Command Center                   │    │
│  React Router│  │ Accounts Payable Hub                 │    │
│              │  │ Fraud Detection                      │    │
│  Redux Store │  │ Budget Management                    │    │
│              │  │ Vendor Portal                        │    │
│  TypeScript  │  │ Audit & Compliance                   │    │
│              │  │ Settings                             │    │
└──────────────┴──┴─────────────────────────────────────┘    │
                             │                                 │
┌────────────────────────────▼─────────────────────────────────┐
│                    API Gateway Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Kong/Envoy ──────────────────────────────────────────────  │
│  • Rate Limiting   • Authentication   • Request Routing     │
│  • SSL Termination • Logging          • Load Balancing      │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    Microservices Layer                       │
├──────────────┬─────────────┬─────────────┬──────────────┤
│  Auth Service│  AP Service │Fraud Service│Budget Service│
├──────────────┼─────────────┼─────────────┼──────────────┤
│Vendor Service│Analytics Svc│ Audit Service│Notification │
└──────────────┴─────────────┴─────────────┴──────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL ──┐  ┌─────────────────────────────────────┐    │
│               │  │ auth_schema                         │    │
│  Primary DB   │  │ ap_schema                           │    │
│               │  │ finance_schema                      │    │
│  Read Replicas│  │ audit_schema                        │    │
│               │  │ vendor_schema                       │    │
└───────────────┴──┴─────────────────────────────────────┘    │
               │                                                │
┌──────────────▼───────────────────────────────────────────────┐
│                    Supporting Infrastructure                  │
├─────────────────────────────────────────────────────────────┤
│  Redis Cache  │  RabbitMQ  │  ClickHouse  │  ML Serving     │
│  Session Mgmt │  Message Q │  Data Warehouse│  TensorFlow   │
└───────────────┴────────────┴──────────────┴────────────────┘
```

## Diagram 2: Data Flow
```
User Request
    │
    ▼
[Frontend App]
    │
    ▼
[API Gateway] → Rate Limiting → Authentication → Routing
    │
    ▼
[Microservice] → Business Logic → Data Validation
    │
    ▼
[Database]     → Transaction → Data Persistence
    │
    ▼
[Cache Layer]  → Redis → Response Caching
    │
    ▼
[Response]     → API Gateway → Frontend → User
```

## Diagram 3: Authentication Flow
```
┌─────────┐     1. Login Request      ┌─────────────┐
│         ├───────────────────────────►│   Auth      │
│ Frontend│                            │  Service    │
│         │◄───────────────────────────┤             │
└─────────┘     2. JWT Token          └──────┬──────┘
    │                                         │
    │ 3. API Request with JWT                 │ 4. Validate Token
    ▼                                         ▼
┌─────────┐                           ┌─────────────┐
│  API    │                           │   Redis     │
│ Gateway ├───────────────────────────►│  Session    │
│         │     5. Forward Request    │   Store     │
└─────────┘                           └─────────────┘
    │
    ▼
┌─────────┐
│ Service │
└─────────┘
```

## Diagram 4: Deployment Architecture
```
┌─────────────────────────────────────────────────────────┐
│                  Production Environment                  │
├─────────────────────────────────────────────────────────┤
│                     Kubernetes Cluster                   │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Ingress   │  │   Ingress   │  │   Ingress   │    │
│  │ Controller  │  │ Controller  │  │ Controller  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  Service Mesh                   │    │
│  │                (Istio/Envoy)                    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Auth      │  │    AP       │  │   Fraud     │    │
│  │  Pod        │  │   Pod       │  │   Pod       │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │   Redis     │  │ RabbitMQ    │    │
│  │   Stateful  │  │   Cluster   │  │   Cluster   │    │
│  │     Set     │  │             │  │             │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Diagram 5: CI/CD Pipeline
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Code     │────►│   Build &   │────►│   Unit      │
│   Commit    │     │   Package   │     │   Tests     │
└─────────────┘     └─────────────┘     └─────────────┘
                                                    │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Integration │◄────│   Docker    │◄────│ Security    │
│   Tests     │     │   Image     │     │   Scan      │
└─────────────┘     └─────────────┘     └─────────────┘
        │                                        │
        ▼                                        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Staging   │────►│  E2E Tests  │────►│ Production  │
│ Deployment  │     │             │     │ Deployment  │
└─────────────┘     └─────────────┘     └─────────────┘
                                                    │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Monitoring  │◄────│    Smoke    │◄────│   Canary    │
│   & Logs    │     │    Tests    │     │  Rollout    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Diagram 6: Monitoring Stack
```
┌─────────────────────────────────────────────────────────┐
│                    Monitoring Stack                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Application │  │  System     │  │   Business  │    │
│  │   Metrics   │  │  Metrics    │  │   Metrics   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                 │                 │           │
│  ┌──────▼────────────────▼─────────────────▼──────┐    │
│  │                Prometheus                       │    │
│  │              Metrics Collector                  │    │
│  └─────────────────────┬──────────────────────────┘    │
│                        │                                 │
│  ┌─────────────────────▼──────────────────────────┐    │
│  │                Grafana                          │    │
│  │            Dashboards & Alerts                  │    │
│  └─────────────────────┬──────────────────────────┘    │
│                        │                                 │
│  ┌─────────────────────▼──────────────────────────┐    │
│  │              Alert Manager                      │    │
│  │         Slack / PagerDuty / Email              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Logs      │  │   Traces    │  │   Uptime    │    │
│  │  ELK Stack  │  │   Jaeger    │  │ Monitoring  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Diagram 7: Module Interaction
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   AP Hub    │─────►│   Fraud     │─────►│  Analytics  │
│   Module    │      │  Detection  │      │   Service   │
└─────────────┘      └─────────────┘      └─────────────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Budget    │─────►│   Audit     │─────►│   Vendor    │
│ Management  │      │   Service   │      │   Portal    │
└─────────────┘      └─────────────┘      └─────────────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                      ┌──────▼──────┐
                      │   CFO       │
                      │ Command Ctr │
                      └─────────────┘
```

## Diagram 8: Security Layers
```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 7: Application Security                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • Input Validation                              │    │
│  │ • Authentication & Authorization                │    │
│  │ • Session Management                            │    │
│  │ • Business Logic Validation                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Layer 6: API Security                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • Rate Limiting                                 │    │
│  │ • API Key Management                            │    │
│  │ • Request Validation                            │    │
│  │ • Response Filtering                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Layer 5: Network Security                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • VPC Isolation                                 │    │
│  │ • Security Groups                               │    │
│  │ • Web Application Firewall                      │    │
│  │ • DDoS Protection                               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Layer 4: Infrastructure Security                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • Container Security Scanning                   │    │
│  │ • Secret Management                             │    │
│  │ • IAM Policies                                  │    │
│  │ • Network Policies                              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Layer 3: Data Security                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • Encryption at Rest                            │    │
│  │ • Encryption in Transit                         │    │
│  │ • Data Masking                                  │    │
│  │ • Backup Encryption                             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Layer 2: Monitoring & Compliance                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • Audit Logging                                 │    │
│  │ • Security Monitoring                           │    │
│  │ • Compliance Reporting                          │    │
│  │ • Incident Response                             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Layer 1: Physical Security                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • Data Center Security                          │    │
│  │ • Physical Access Controls                      │    │
│  │ • Redundant Power & Cooling                     │    │
│  │ • Disaster Recovery Sites                       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```