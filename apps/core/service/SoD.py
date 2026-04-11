from dataclasses import dataclass, field


@dataclass
class AssignmentState:
    assignments: dict[int, int] = field(default_factory=dict)
    submitter_id: int = 0


def sod_check(
    assignment: AssignmentState, step: int, actor_id: int
) -> tuple[bool, str]:
    """

    1. Actor hasnt alreay approved any earlier step
    2. Actor isnt the submitter
    3. Valid assignment still exists after this

    """

    if actor_id == assignment.submitter_id:
        return False, "Actor is the submitter - self-approval forbidden"

    if actor_id in assignment.assignments.values():
        prior_step = [s for s, u in assignment.assignments.items() if u == actor_id][0]
        return False, f"Actor already approved step {prior_step}"

    return True, ""


def apply_approval(
    assignment: AssignmentState, step: int, actor_id: int
) -> AssignmentState:
    ok, reason = sod_check(assignment, step, actor_id)
    if not ok:
        raise ValueError(f"SoD violation: {reason}")

    return AssignmentState(
        assignments={**assignment.assignments, step: actor_id},
        submitter_id=assignment.submitter_id,
    )
