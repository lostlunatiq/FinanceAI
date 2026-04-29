from rest_framework.permissions import BasePermission


class HasMinimumGrade(BasePermission):
    min_grade = 1

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and (request.user.employee_grade or 0) >= self.min_grade
        )

    @classmethod
    def make(cls, min_grade: int):
        return type(
            f"HasMinimumGrade_{min_grade}",
            (cls,),
            {"min_grade": min_grade},
        )


def hod_dept_filter(user, qs, dept_lookup: str):
    """
    For Grade-2 HOD users: filter queryset to their department only.
    For all other grades: return the queryset unchanged.

    dept_lookup: ORM lookup path to the department FK, e.g.
        "submitted_by__department"  for Expense
        "department"                for Budget
    """
    if (user.employee_grade or 0) != 2:
        return qs
    if user.department_id:
        return qs.filter(**{dept_lookup: user.department})
    # HOD with no department assigned — fall back to own records
    submitter_lookup = dept_lookup.replace("__department", "")
    if submitter_lookup == dept_lookup:
        return qs.none()
    return qs.filter(**{submitter_lookup: user})
