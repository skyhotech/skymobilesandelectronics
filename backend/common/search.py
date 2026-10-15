"""Bounded deterministic search, independent of database collation."""

import re

from django.db.models import Q
from django.db.models.functions import Lower

STOPWORDS = {"show", "me", "find", "search", "for", "the", "a", "an", "please", "all"}
SYNONYMS = (
    {"phone", "phones", "mobile", "mobiles", "smartphone", "smartphones"},
    {"earbud", "earbuds", "earphone", "earphones"},
    {"laptop", "laptops", "notebook", "notebooks"},
)


def search_tokens(query):
    return list(dict.fromkeys(
        token for token in re.findall(r"[^\W_]+", query.lower()[:120], re.UNICODE)
        if token not in STOPWORDS
    ))[:8]


def search_queryset(queryset, query, fields):
    """AND normalized tokens; OR each token's synonyms across explicit text fields."""
    tokens = search_tokens(query)
    if not tokens:
        return queryset.none()
    aliases = {f"sky_search_{index}": Lower(field) for index, field in enumerate(fields)}
    queryset = queryset.alias(**aliases)
    for token in tokens:
        variants = next((group for group in SYNONYMS if token in group), {token})
        condition = Q()
        for alias in aliases:
            for variant in sorted(variants):
                condition |= Q(**{f"{alias}__contains": variant})
        queryset = queryset.filter(condition)
    return queryset
