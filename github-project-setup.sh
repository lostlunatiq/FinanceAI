#!/usr/bin/env zsh
#
# gh_project_setup.sh
# -------------------
# FinanceAI — Create and configure a GitHub Project (v2) for the repo,
# add all repo issues to it, and back-fill Status / Priority / Size / Area
# fields from issue labels.
#
# Run AFTER gh_bulk_setup.sh has created labels, milestones, and issues.
#
# What it does:
#   1. Verifies gh + jq + repo + project scope on the token.
#   2. Creates a Projects v2 board: "FinanceAI — Build Plan" under @me.
#   3. Links the project to the current repo.
#   4. Creates custom fields:
#        - Status (single-select)        Backlog / Ready / In Progress / In Review / Blocked / Done
#        - Priority (single-select)      P0 / P1 / P2
#        - Size (single-select)          XS / S / M / L / XL
#        - Area (single-select)          one option per area:* label
#        - Sprint (iteration)            2-week sprints starting next Monday
#        - Start date (date)
#        - Target date (date)
#   5. Adds every open issue in the repo to the project.
#   6. For each project item, derives Priority / Size / Area from issue labels
#      and sets the corresponding field. Status defaults to "Backlog".
#   7. Prints the project URL at the end.
#
# Required token scopes:
#   repo, project   (run: gh auth refresh -s project,read:project)
#
# Usage:
#   cd <your-repo-clone>
#   chmod +x gh_project_setup.sh
#   ./gh_project_setup.sh
#
set -euo pipefail

# ---------- helpers ----------
c_red() { printf "\033[31m%s\033[0m\n" "$*"; }
c_grn() { printf "\033[32m%s\033[0m\n" "$*"; }
c_yel() { printf "\033[33m%s\033[0m\n" "$*"; }
c_blu() { printf "\033[34m%s\033[0m\n" "$*"; }
hr()    { printf '%s\n' "------------------------------------------------------------"; }

require() { command -v "$1" >/dev/null 2>&1 || { c_red "Missing dependency: $1"; exit 1; }; }
require gh
require jq

# ---------- preflight ----------
if ! gh auth status >/dev/null 2>&1; then
  c_red "gh is not authenticated. Run: gh auth login"
  exit 1
fi

# Check project scope
if ! gh auth status 2>&1 | grep -qiE 'project'; then
  c_yel "Your gh token may be missing the 'project' scope."
  c_yel "If the script fails on project calls, run:"
  c_yel "  gh auth refresh -s project,read:project"
  hr
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
if [[ -z "${REPO}" ]]; then
  c_red "No default repo detected. Run inside a cloned repo, or:"
  c_red "  gh repo set-default owner/repo"
  exit 1
fi
OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"

c_blu "Repo:  ${REPO}"
c_blu "Owner: ${OWNER} (user account)"
hr

PROJECT_TITLE="FinanceAI — Build Plan"

# ---------- 1. Create project ----------
c_blu "[1/6] Creating project: ${PROJECT_TITLE}"

# If a project with the same title already exists for this user, reuse it.
EXISTING_PROJECT_NUMBER=$(
  gh project list --owner "@me" --format json --limit 200 \
    | jq -r --arg t "$PROJECT_TITLE" '.projects[] | select(.title == $t) | .number' \
    | head -n 1
)

if [[ -n "${EXISTING_PROJECT_NUMBER}" ]]; then
  c_yel "  Project already exists (#${EXISTING_PROJECT_NUMBER}). Reusing it."
  PROJECT_NUMBER="${EXISTING_PROJECT_NUMBER}"
else
  PROJECT_NUMBER=$(
    gh project create --owner "@me" --title "${PROJECT_TITLE}" --format json \
      | jq -r '.number'
  )
  c_grn "  Created project #${PROJECT_NUMBER}"
fi

# Resolve project node id (needed for GraphQL field mutations)
PROJECT_JSON=$(gh project view "${PROJECT_NUMBER}" --owner "@me" --format json)
PROJECT_ID=$(echo "${PROJECT_JSON}" | jq -r '.id')
PROJECT_URL=$(echo "${PROJECT_JSON}" | jq -r '.url')
c_blu "  Project ID:  ${PROJECT_ID}"
c_blu "  Project URL: ${PROJECT_URL}"

# ---------- 2. Link project to repo ----------
c_blu "[2/6] Linking project to repo ${REPO}"
gh project link "${PROJECT_NUMBER}" --owner "@me" --repo "${REPO}" >/dev/null 2>&1 \
  && c_grn "  Linked." \
  || c_yel "  (link may already exist; continuing)"

# ---------- 3. Create custom fields ----------
c_blu "[3/6] Creating custom fields"

# Helper: get id of an existing field by name (echo blank if not found)
get_field_id() {
  local name="$1"
  gh project field-list "${PROJECT_NUMBER}" --owner "@me" --format json --limit 50 \
    | jq -r --arg n "$name" '.fields[] | select(.name == $n) | .id' \
    | head -n 1
}

# Helper: create a single-select field unless it exists.
# Args: field_name, comma-separated options
create_single_select_field() {
  local name="$1" options_csv="$2"
  local existing
  existing=$(get_field_id "$name")
  if [[ -n "$existing" ]]; then
    echo "  = ${name} (exists)"
    return 0
  fi
  gh project field-create "${PROJECT_NUMBER}" --owner "@me" \
    --name "$name" \
    --data-type SINGLE_SELECT \
    --single-select-options "$options_csv" >/dev/null
  echo "  + ${name}"
}

create_date_field() {
  local name="$1"
  local existing
  existing=$(get_field_id "$name")
  if [[ -n "$existing" ]]; then
    echo "  = ${name} (exists)"
    return 0
  fi
  gh project field-create "${PROJECT_NUMBER}" --owner "@me" \
    --name "$name" \
    --data-type DATE >/dev/null
  echo "  + ${name}"
}

# Status (note: Projects v2 ships with a default 'Status' field; we'll reuse it)
# We try to create our own; if it fails because Status already exists, we adopt that.
STATUS_OPTS="Backlog,Ready,In Progress,In Review,Blocked,Done"
EXISTING_STATUS_ID=$(get_field_id "Status")
if [[ -z "$EXISTING_STATUS_ID" ]]; then
  gh project field-create "${PROJECT_NUMBER}" --owner "@me" \
    --name "Status" \
    --data-type SINGLE_SELECT \
    --single-select-options "$STATUS_OPTS" >/dev/null
  echo "  + Status"
else
  echo "  = Status (default project field reused)"
fi

create_single_select_field "Priority" "P0,P1,P2"
create_single_select_field "Size"     "XS,S,M,L,XL"

# Area: one option per area:* label
AREA_OPTS="Auth,RBAC,Audit,Expenses,Invoices-Purchase,Vendors,Approvals,Budget,D365,AI,Frontend,Backend,Infra,DB,Notifications"
create_single_select_field "Area" "$AREA_OPTS"

create_date_field "Start date"
create_date_field "Target date"

# Sprint (iteration field) — gh CLI does not support creating ITERATION fields.
# We create it via GraphQL.
SPRINT_FIELD_ID=$(get_field_id "Sprint")
if [[ -z "$SPRINT_FIELD_ID" ]]; then
  # Compute next Monday in YYYY-MM-DD
  NEXT_MONDAY=$(python3 -c "
import datetime
today = datetime.date.today()
days = (7 - today.weekday()) % 7
days = days or 7
print((today + datetime.timedelta(days=days)).isoformat())
" 2>/dev/null || date -d "next monday" +%F 2>/dev/null || date -v+Mon +%F)

  gh api graphql -f query='
    mutation($projectId: ID!, $name: String!, $startDate: Date!) {
      createProjectV2Field(input: {
        projectId: $projectId,
        dataType: ITERATION,
        name: $name,
        iterationConfiguration: {
          startDate: $startDate,
          duration: 14,
          iterations: []
        }
      }) {
        projectV2Field {
          ... on ProjectV2IterationField { id name }
        }
      }
    }' \
    -f projectId="$PROJECT_ID" \
    -f name="Sprint" \
    -f startDate="$NEXT_MONDAY" >/dev/null \
    && echo "  + Sprint (2-week iterations from $NEXT_MONDAY)" \
    || c_yel "  ! Sprint iteration field creation failed (continuing)"
else
  echo "  = Sprint (exists)"
fi

# ---------- 4. Resolve field + option IDs (for setting values later) ----------
c_blu "[4/6] Resolving field + option IDs"

FIELDS_JSON=$(gh project field-list "${PROJECT_NUMBER}" --owner "@me" --format json --limit 100)

field_id_by_name() {
  echo "$FIELDS_JSON" | jq -r --arg n "$1" '.fields[] | select(.name == $n) | .id' | head -n1
}

option_id() {
  local field_name="$1" option_name="$2"
  echo "$FIELDS_JSON" | jq -r --arg f "$field_name" --arg o "$option_name" '
    .fields[]
    | select(.name == $f)
    | .options[]?
    | select(.name == $o)
    | .id
  ' | head -n1
}

STATUS_FIELD_ID=$(field_id_by_name "Status")
PRIORITY_FIELD_ID=$(field_id_by_name "Priority")
SIZE_FIELD_ID=$(field_id_by_name "Size")
AREA_FIELD_ID=$(field_id_by_name "Area")

STATUS_BACKLOG_ID=$(option_id "Status" "Backlog")

# Map: priority label -> option id
typeset -A PRIORITY_OPT
PRIORITY_OPT[priority:p0]=$(option_id "Priority" "P0")
PRIORITY_OPT[priority:p1]=$(option_id "Priority" "P1")
PRIORITY_OPT[priority:p2]=$(option_id "Priority" "P2")

typeset -A SIZE_OPT
SIZE_OPT[size:xs]=$(option_id "Size" "XS")
SIZE_OPT[size:s]=$(option_id "Size" "S")
SIZE_OPT[size:m]=$(option_id "Size" "M")
SIZE_OPT[size:l]=$(option_id "Size" "L")
SIZE_OPT[size:xl]=$(option_id "Size" "XL")

typeset -A AREA_OPT
AREA_OPT[area:auth]=$(option_id "Area" "Auth")
AREA_OPT[area:rbac]=$(option_id "Area" "RBAC")
AREA_OPT[area:audit]=$(option_id "Area" "Audit")
AREA_OPT[area:expenses]=$(option_id "Area" "Expenses")
AREA_OPT[area:invoices-purchase]=$(option_id "Area" "Invoices-Purchase")
AREA_OPT[area:vendors]=$(option_id "Area" "Vendors")
AREA_OPT[area:approvals]=$(option_id "Area" "Approvals")
AREA_OPT[area:budget]=$(option_id "Area" "Budget")
AREA_OPT[area:d365]=$(option_id "Area" "D365")
AREA_OPT[area:ai]=$(option_id "Area" "AI")
AREA_OPT[area:frontend]=$(option_id "Area" "Frontend")
AREA_OPT[area:backend]=$(option_id "Area" "Backend")
AREA_OPT[area:infra]=$(option_id "Area" "Infra")
AREA_OPT[area:db]=$(option_id "Area" "DB")
AREA_OPT[area:notifications]=$(option_id "Area" "Notifications")

# ---------- 5. Add all repo issues to project ----------
c_blu "[5/6] Adding all repo issues to project"

# Pull all open issues with labels in one shot
ISSUES_JSON=$(gh issue list --state open --limit 500 --json number,title,labels,url)
ISSUE_COUNT=$(echo "$ISSUES_JSON" | jq 'length')
echo "  Found ${ISSUE_COUNT} open issues."

# We need item IDs after adding. gh project item-add returns the item id.
# Build a map: issue_number -> item_id
typeset -A ITEM_ID_BY_ISSUE

while IFS= read -r row; do
  _jq() { echo "$row" | base64 --decode | jq -r "$1"; }
  num=$(_jq '.number')
  url=$(_jq '.url')
  title=$(_jq '.title')

  add_json=$(gh project item-add "${PROJECT_NUMBER}" --owner "@me" --url "$url" --format json 2>/dev/null || true)
  item_id=$(echo "$add_json" | jq -r '.id // empty')

  if [[ -z "$item_id" ]]; then
    c_yel "  ! Failed to add #${num} (may already be on project); attempting lookup"
    # Fallback: list project items and find by content url
    item_id=$(gh project item-list "${PROJECT_NUMBER}" --owner "@me" --format json --limit 500 \
      | jq -r --arg url "$url" '.items[] | select(.content.url == $url) | .id' | head -n1)
  fi

  if [[ -n "$item_id" ]]; then
    ITEM_ID_BY_ISSUE[$num]="$item_id"
    echo "  + #${num} ${title:0:60}"
  else
    c_red "  x Could not resolve item id for #${num}"
  fi
done

# ---------- 6. Set Status / Priority / Size / Area for each item ----------
c_blu "[6/6] Setting Status / Priority / Size / Area from labels"

set_single_select() {
  local item_id="$1" field_id="$2" option_id="$3"
  [[ -z "$field_id" || -z "$option_id" || -z "$item_id" ]] && return 0
  gh project item-edit \
    --id "$item_id" \
    --project-id "$PROJECT_ID" \
    --field-id "$field_id" \
    --single-select-option-id "$option_id" >/dev/null 2>&1 || true
}

for row in $(echo "$ISSUES_JSON" | jq -r '.[] | @base64'); do
  _jq() { echo "$row" | base64 --decode | jq -r "$1"; }
  num=$(_jq '.number')
  labels_csv=$(_jq '[.labels[].name] | join(",")')
  item_id="${ITEM_ID_BY_ISSUE[$num]:-}"
  [[ -z "$item_id" ]] && continue

  # Default Status = Backlog
  set_single_select "$item_id" "$STATUS_FIELD_ID" "$STATUS_BACKLOG_ID"

  # Priority — pick the highest (p0 > p1 > p2)
  for p in priority:p0 priority:p1 priority:p2; do
    if [[ ",$labels_csv," == *",$p,"* ]]; then
      set_single_select "$item_id" "$PRIORITY_FIELD_ID" "${PRIORITY_OPT[$p]}"
      break
    fi
  done

  # Size — first match
  for s in size:xs size:s size:m size:l size:xl; do
    if [[ ",$labels_csv," == *",$s,"* ]]; then
      set_single_select "$item_id" "$SIZE_FIELD_ID" "${SIZE_OPT[$s]}"
      break
    fi
  done

  # Area — first matching area:* label (issue may have several; we pick the first)
  for a_label in "${!AREA_OPT[@]}"; do
    if [[ ",$labels_csv," == *",$a_label,"* ]]; then
      set_single_select "$item_id" "$AREA_FIELD_ID" "${AREA_OPT[$a_label]}"
      break
    fi
  done

  echo "  ~ #${num} fields set"
done

hr
c_grn "Project setup complete."
echo
c_blu "Open the project:"
echo "  ${PROJECT_URL}"
echo
c_yel "Manual steps still required (Projects v2 limitations):"
c_yel "  1. Create the views in the project UI:"
c_yel "       - Board view grouped by Status"
c_yel "       - Roadmap view grouped by Milestone (uses milestone due dates)"
c_yel "       - Table view grouped by Area"
c_yel "       - Priority table sorted by Priority then Size"
c_yel "  2. Set up auto-add workflow:"
c_yel "       Project Settings → Workflows → 'Auto-add to project'"
c_yel "       Filter: is:issue label:type:feature,type:chore,type:bug,type:spike"
c_yel "  3. (Optional) Set up 'Item closed' workflow → set Status = Done"
