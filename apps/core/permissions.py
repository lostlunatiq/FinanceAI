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
