from __future__ import annotations

import uuid
from typing import Any, Dict, Iterable, List, Optional, Tuple

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Batch,
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    Range,
    VectorParams,
)

COLLECTION_NAME = "personalities"
EMBEDDING_DIM = 1536

# Qdrant requires UUID or unsigned int point IDs.
# Firebase UIDs are arbitrary strings, so we derive a deterministic UUID5.
_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # DNS namespace


def uid_to_qdrant_id(firebase_uid: str) -> str:
    """Convert a Firebase UID to a deterministic UUID suitable for Qdrant."""
    return str(uuid.uuid5(_NAMESPACE, firebase_uid))


def _to_filter(filter_: Optional[Dict[str, Any]]) -> Optional[Filter]:
    if not filter_:
        return None
    conditions = []
    for key, value in filter_.items():
        if isinstance(value, dict):
            range_kwargs = {}
            for op in ("gt", "gte", "lt", "lte"):
                if op in value:
                    range_kwargs[op] = value[op]
            if range_kwargs:
                conditions.append(FieldCondition(key=key, range=Range(**range_kwargs)))
                continue
        conditions.append(FieldCondition(key=key, match=MatchValue(value=value)))
    return Filter(must=conditions) if conditions else None


class QdrantAdapter:
    def __init__(self, url: str, api_key: str):
        self.client = QdrantClient(
            url=url,
            api_key=api_key,
            prefer_grpc=False,
            check_compatibility=False,
            timeout=30,
        )

    def ensure_collection(
        self, name: str = COLLECTION_NAME, dim: int = EMBEDDING_DIM
    ) -> None:
        if not self.client.collection_exists(collection_name=name):
            self.client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
            )

    def upsert(
        self,
        collection: str,
        points: Iterable[Tuple[str, List[float], Dict[str, Any]]],
    ) -> None:
        ids, vectors, payloads = [], [], []
        for pid, vec, payload in points:
            ids.append(pid)
            vectors.append(vec)
            payloads.append(payload)
        if not ids:
            return
        self.client.upsert(
            collection_name=collection,
            points=Batch(ids=ids, vectors=vectors, payloads=payloads),
        )

    def query(
        self,
        collection: str,
        vector: List[float],
        limit: int = 50,
        filter_: Optional[Dict[str, Any]] = None,
        with_payload: bool = True,
        with_vectors: bool = False,
    ) -> List[Dict[str, Any]]:
        resp = self.client.query_points(
            collection_name=collection,
            query=vector,
            query_filter=_to_filter(filter_),
            limit=limit,
            with_payload=with_payload,
            with_vectors=with_vectors,
        )
        out = []
        for sp in resp.points:
            out.append(
                {
                    "id": str(sp.id),
                    "score": float(sp.score),
                    "payload": dict(sp.payload or {}),
                    "vector": list(sp.vector)
                    if getattr(sp, "vector", None) is not None
                    else None,
                }
            )
        return out

    def delete(self, collection: str, ids: List[str]) -> None:
        if not ids:
            return
        self.client.delete(collection_name=collection, points_selector=ids)
