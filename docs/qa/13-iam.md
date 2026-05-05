# 🧪 Feature: User & IAM Management
**Component Scope:** DRF `auth_views` (User CRUD) → PostgreSQL `core_user`, `core_department`, `auth_group`, `core_groupprofile` → Grade-based RBAC
**Objective:** Verify user CRUD (create, list, detail, update, export), department assignment, group/policy management, and grade-based access control.

### 1. Prerequisites & State Setup
- [ ] 10+ demo users seeded across all 6 grades.
- [ ] 3+ departments created.
- [ ] 5+ groups with varying policies.
- [ ] `fin_admin` (grade 4) account ready to manage IAM.

### 2. The Happy Path

#### 2.1 User list
- [ ] As `fin_admin`: `GET /api/v1/auth/users/`.
- [ ] **Assert API:** `200`; list all users, paginated, with `id`, `username`, `email`, `employee_grade`, `department`, `groups[]`, `is_active`.

#### 2.2 User create
- [ ] As `fin_admin`: `POST /api/v1/auth/users/` with `{username: "newuser", email: "new@example.com", employee_grade: 2, department_id: <uuid>, is_active: true, password: "SecurePass123"}`.
- [ ] **Assert API:** `201`; user created with hashed password, grade 2 assigned.
- [ ] **Assert DB:** User row inserted; password hashed (not plaintext).

#### 2.3 User detail / update
- [ ] As `fin_admin`: `GET /api/v1/auth/users/<uuid>/`.
- [ ] **Assert:** full user detail.
- [ ] `PATCH /api/v1/auth/users/<uuid>/` with `{employee_grade: 3, is_active: false}`.
- [ ] **Assert:** `200`; user updated; grade changed to 3.
- [ ] **Assert DB:** AuditLog row with `action="user.updated"`, changes captured.

#### 2.4 User export (CSV)
- [ ] As `fin_admin`: `GET /api/v1/auth/users/export/?format=csv`.
- [ ] **Assert:** CSV with all users; columns: username, email, grade, department, groups, created_at.

#### 2.5 Department list / create
- [ ] `GET /api/v1/auth/departments/`.
- [ ] **Assert:** all departments, with user count, budget summary.
- [ ] `POST /api/v1/auth/departments/` with `{name: "New Dept", head_id: <user_uuid>}`.
- [ ] **Assert:** `201`; department created with head assigned.

#### 2.6 Group list
- [ ] `GET /api/v1/auth/groups/`.
- [ ] **Assert:** all groups (including default Django groups); count, description, members.

#### 2.7 Group detail / policies
- [ ] `GET /api/v1/auth/groups/<id>/`.
- [ ] **Assert:** group members, role.
- [ ] `GET /api/v1/auth/groups/<id>/policies/` (or edit via detail).
- [ ] **Assert API:** `200`; body includes `policies: {Expenses: true, Vendors: false, Budgets: true, …}` (JSON object per GroupProfile).
- [ ] Update policies: `PATCH /api/v1/auth/groups/<id>/policies/` with `{Vendors: true}`.
- [ ] **Assert:** `200`; GroupProfile.policies updated.

#### 2.8 User to group assignment
- [ ] Add user to a group: `PATCH /api/v1/auth/users/<uuid>/` with `{groups: [<group_id1>, <group_id2>]}` (or via group endpoint).
- [ ] **Assert:** user's groups list updated.

### 3. Negative Testing

- [ ] Create user as `fin_manager` (grade 3) → **`403`** (only grade 4+).
- [ ] Create user with invalid email format → **`400`**.
- [ ] Create user with `employee_grade=99` (out of range 0–5) → **`400`**.
- [ ] Create user with duplicate username → **`400`** unique constraint.
- [ ] Update user's department to non-existent ID → **`404`** or **`400`**.
- [ ] Delete user (if delete endpoint exists) as grade 3 → **`403`** (or soft-delete: is_active=false).
- [ ] Export users as non-admin → **`403`**.
- [ ] Assign user to non-existent group → **`400`** or **`404`**.
- [ ] Update group policies with invalid policy name (e.g. `{FakePolicy: true}`) → **`400`** or ignored (record).

### 4. Edge Cases & Concurrency

- [ ] **Self-update:** user updates own email (if allowed) → succeeds.
- [ ] **Self-delete:** user tries to deactivate own account → **`403`** or allowed (policy decision; record).
- [ ] **Concurrent user creation:** two admins create same username simultaneously → one succeeds, one gets `400` unique constraint error.
- [ ] **Group policy cascades:** update group policies; existing users in group should see updated permissions (verification depends on how permissions are cached — check immediately).
- [ ] **Department head reassignment:** reassign department head to another user → old head loses HOD scoping privileges (if scoping is tied to role).
- [ ] **User grade upgrade:** user grade 1 → grade 3; their cached auth token is still valid with old grade until refresh (session state; eventual consistency OK).
- [ ] **Bulk user export (1000+ users):** CSV streams without OOM.
- [ ] **Non-ASCII username:** create user `उपयोगकर्ता` (Hindi) → accepted or rejected (record).
- [ ] **Email with plus addressing:** `user+tag@example.com` → accepted; stored correctly.
- [ ] **Group with zero members:** group exists with no users; no crash on policy evaluation (policies default to safe deny).
- [ ] **Department with no head:** department created without head_id → allowed (nullable); HOD scoping disabled for dept.
