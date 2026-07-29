"""Versioned grammar-construction catalog and deterministic compatibility mapping."""

from __future__ import annotations

import json
import re
from contextlib import suppress
from enum import StrEnum
from functools import lru_cache
from importlib.resources import files
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class GrammarFacet(StrEnum):
    FORM = "form"
    MEANING = "meaning"
    USE = "use"


class GrammarModality(StrEnum):
    RECEPTIVE = "receptive"
    PRODUCTIVE = "productive"


class GrammarRelationType(StrEnum):
    IS_A = "IS_A"
    REQUIRES = "REQUIRES"
    VARIANT_OF = "VARIANT_OF"
    CONTRASTS_WITH = "CONTRASTS_WITH"
    COMMONLY_CONFUSED_WITH = "COMMONLY_CONFUSED_WITH"
    REALIZES_FUNCTION = "REALIZES_FUNCTION"
    SUPPORTS_EXAM_SKILL = "SUPPORTS_EXAM_SKILL"


class GrammarRelation(_StrictModel):
    relation_type: GrammarRelationType
    target_id: str = Field(pattern=r"^[a-z][a-z0-9_.]+\.v[1-9][0-9]*$")


class GrammarConstruction(_StrictModel):
    construction_id: str = Field(pattern=r"^[a-z][a-z0-9_.]+\.v[1-9][0-9]*$")
    version: Annotated[int, Field(ge=1)]
    title_zh: str = Field(min_length=2, max_length=120)
    family: str = Field(min_length=2, max_length=80)
    form: str = Field(min_length=3, max_length=1000)
    meaning: str = Field(min_length=3, max_length=1000)
    use: str = Field(min_length=3, max_length=1000)
    constraints: tuple[str, ...] = Field(min_length=1)
    aliases: tuple[str, ...] = ()
    relations: tuple[GrammarRelation, ...] = ()
    parser_signatures: tuple[str, ...] = ()
    can_do_outcomes: tuple[str, ...] = Field(min_length=1)
    external_mappings: tuple[str, ...] = ()

    @model_validator(mode="after")
    def id_version_matches(self) -> GrammarConstruction:
        if not self.construction_id.endswith(f".v{self.version}"):
            raise ValueError("grammar_construction_id_version_mismatch")
        return self


class GrammarCatalog(_StrictModel):
    catalog_id: str = Field(pattern=r"^[a-z][a-z0-9_.-]+$")
    version: Annotated[int, Field(ge=1)]
    constructions: tuple[GrammarConstruction, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def graph_is_valid(self) -> GrammarCatalog:
        ids = [item.construction_id for item in self.constructions]
        if len(ids) != len(set(ids)):
            raise ValueError("grammar_construction_ids_must_be_unique")
        id_set = set(ids)
        aliases: dict[str, str] = {}
        for item in self.constructions:
            for relation in item.relations:
                if relation.target_id not in id_set:
                    raise ValueError(
                        f"grammar_relation_target_missing:{item.construction_id}:"
                        f"{relation.target_id}"
                    )
            for raw_alias in (item.construction_id, *item.aliases):
                alias = normalize_grammar_alias(raw_alias)
                previous = aliases.get(alias)
                if previous is not None and previous != item.construction_id:
                    raise ValueError(f"grammar_alias_collision:{raw_alias}")
                aliases[alias] = item.construction_id
        _require_acyclic_prerequisites(self.constructions)
        return self

    def by_id(self, construction_id: str) -> GrammarConstruction:
        for item in self.constructions:
            if item.construction_id == construction_id:
                return item
        raise KeyError(construction_id)


@lru_cache(maxsize=1)
def load_grammar_catalog() -> GrammarCatalog:
    """Load the bundled catalog once and validate the complete relation graph."""

    resource = files("binnagent_domain.learning").joinpath(
        "data",
        "grammar-catalog.v1.json",
    )
    return GrammarCatalog.model_validate(json.loads(resource.read_text(encoding="utf-8")))


def resolve_construction_id(value: str) -> str:
    """Resolve only an exact canonical ID or reviewed legacy alias."""

    normalized = normalize_grammar_alias(value)
    for construction in load_grammar_catalog().constructions:
        if normalized in {
            normalize_grammar_alias(construction.construction_id),
            *(normalize_grammar_alias(alias) for alias in construction.aliases),
        }:
            return construction.construction_id
    raise ValueError(f"grammar_construction_unknown:{value}")


def resolve_construction_from_text(*values: str) -> str | None:
    """Conservatively resolve organizer text; ambiguous or unknown input stays unresolved."""

    exact: set[str] = set()
    for value in values:
        with suppress(ValueError):
            exact.add(resolve_construction_id(value))
    if exact:
        return next(iter(exact)) if len(exact) == 1 else None

    resolved: set[str] = set()
    for value in values:
        normalized = normalize_grammar_alias(value)
        for construction in load_grammar_catalog().constructions:
            for alias in construction.aliases:
                normalized_alias = normalize_grammar_alias(alias)
                if len(normalized_alias) >= 5 and normalized_alias in normalized:
                    resolved.add(construction.construction_id)
    return next(iter(resolved)) if len(resolved) == 1 else None


def normalize_grammar_alias(value: str) -> str:
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "_", value.casefold().strip()).strip("_")


def _require_acyclic_prerequisites(
    constructions: tuple[GrammarConstruction, ...],
) -> None:
    graph = {
        item.construction_id: tuple(
            relation.target_id
            for relation in item.relations
            if relation.relation_type is GrammarRelationType.REQUIRES
        )
        for item in constructions
    }
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        if node in visiting:
            raise ValueError(f"grammar_prerequisite_cycle:{node}")
        if node in visited:
            return
        visiting.add(node)
        for target in graph[node]:
            visit(target)
        visiting.remove(node)
        visited.add(node)

    for construction_id in graph:
        visit(construction_id)
