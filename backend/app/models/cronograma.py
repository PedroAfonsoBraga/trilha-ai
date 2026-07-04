"""
Modelos Pydantic para cronograma por tópicos.
"""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class Disciplina(BaseModel):
    nome: str
    peso: float | None = None
    topicos: list[str] = Field(default_factory=list)
    tempo_total: int | None = None  # em minutos, calculado depois


class ExtractedTopics(BaseModel):
    edital_id: str
    disciplinas: list[Disciplina]
    extracted_at: str
    has_vague_topics: bool = False


class UserConfig(BaseModel):
    dias_da_semana: list[int] = Field(..., description="1=Seg, 7=Dom")
    horas_por_dia: float = Field(..., ge=0.5, le=12)
    nivel_por_disciplina: dict[str, Literal["fraco", "medio", "forte"]]
    reservar_revisao: bool = True
    data_prova: date


class TopicBlock(BaseModel):
    disciplina: str
    topico: str
    duracao_min: int = Field(..., ge=1)
    status: Literal["pendente", "concluido", "pulado"] = "pendente"


class DaySchedule(BaseModel):
    date: date
    blocos: list[TopicBlock] = Field(default_factory=list)
    total_minutos: int = 0


class Cronograma(BaseModel):
    edital_id: str
    user_id: str
    semanas: list[list[DaySchedule]] = Field(default_factory=list)
    gerado_em: str
    config: UserConfig


class CronogramaConfig(BaseModel):
    id: str | None = None
    user_id: str
    edital_id: str
    dias_da_semana: list[int]
    horas_por_dia: float
    reservar_revisao: bool
    nivel_disciplinas: dict[str, str]


class UpdateBlocoRequest(BaseModel):
    status: Literal["pendente", "concluido", "pulado"] | None = None
    duracao_min: int | None = Field(None, ge=1)
    nova_data: date | None = None


class GerarCronogramaRequest(BaseModel):
    edital_id: str
    user_config: UserConfig
