"""Bounded, cycle-safe category traversal shared by reads and writes."""

from rest_framework.exceptions import ValidationError

from .models import Category

MAX_DEPTH = 12


def validate_parent(instance, parent):
    links = dict(Category.objects.values_list("id", "parent_id"))
    if instance is None:
        node_id = -1
    else:
        node_id = instance.pk
    links[node_id] = parent.pk if parent else None
    for start in links:
        seen = set()
        current = start
        while current is not None:
            if current in seen:
                raise ValidationError({"parent": "A category cannot be placed inside itself or its descendants."})
            seen.add(current)
            if len(seen) > MAX_DEPTH:
                raise ValidationError({"parent": f"Category nesting cannot exceed {MAX_DEPTH} levels."})
            current = links.get(current)


def published_categories():
    rows = list(Category.objects.select_related("parent").all())
    by_id = {row.pk: row for row in rows}
    def visible(row):
        seen = set()
        while row:
            if row.pk in seen or not row.is_active or not row.show_on_homepage:
                return False
            seen.add(row.pk)
            if row.parent_id and row.parent_id not in by_id:
                return False
            row = by_id.get(row.parent_id)
        return True
    return [row for row in rows if visible(row)]
