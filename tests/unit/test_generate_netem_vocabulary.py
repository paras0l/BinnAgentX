from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def load_script() -> ModuleType:
    path = PROJECT_ROOT / "scripts" / "generate_netem_vocabulary.py"
    spec = importlib.util.spec_from_file_location("generate_netem_vocabulary", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def generator() -> ModuleType:
    return load_script()


def entry_payload(word: str) -> dict[str, object]:
    return {
        "word": word,
        "ipa_uk": "/test/",
        "ipa_us": "/test/",
        "variants": [],
        "senses": [
            {
                "part_of_speech": "n.",
                "meaning": "测试",
                "exam_note": "用于测试契约",
            }
        ],
        "collocations": [
            {"expression": f"{word} one", "meaning": "搭配一"},
            {"expression": f"{word} two", "meaning": "搭配二"},
        ],
        "example": {
            "sentence": f"This sentence tests the word {word}.",
            "translation": "这个句子用于测试。",
        },
        "word_family": [],
        "contrast": "与相近结构区分。",
        "memory_tip": "按核心语义记忆。",
        "exam_tip": "结合上下文判断。",
    }


def test_validate_batch_requires_exact_input_order(generator: ModuleType) -> None:
    expected = [
        generator.SourceWord(
            sequence=1,
            frequency=10,
            word="alpha",
            source_meaning="甲",
            alternate_spelling=None,
        ),
        generator.SourceWord(
            sequence=2,
            frequency=9,
            word="beta",
            source_meaning="乙",
            alternate_spelling=None,
        ),
    ]
    valid = generator.VocabularyBatch(
        entries=[entry_payload("alpha"), entry_payload("beta")]
    )
    assert generator.validate_batch(valid, expected) is valid
    reversed_batch = generator.VocabularyBatch(
        entries=[entry_payload("beta"), entry_payload("alpha")]
    )
    with pytest.raises(ValueError, match="word mismatch"):
        generator.validate_batch(reversed_batch, expected)


def test_expand_flat_batch_parses_compact_provider_shape(generator: ModuleType) -> None:
    flat = generator.FlatVocabularyBatch(
        entries=[
            {
                "word": "test",
                "ipa_uk": "test",
                "ipa_us": "test",
                "variants": [],
                "senses": ["n. || 测试 || 阅读中常指检验或考验"],
                "collocations": ["put to the test || 使经受检验"],
                "example_sentence": "The claim was put to the test.",
                "example_translation": "这一主张受到了检验。",
                "word_family": ["testing || adj. || 棘手的"],
                "contrast": "test 强调检验, exam 常指正式考试。",
                "memory_tip": "围绕“检验”这一核心义记忆。",
                "exam_tip": "注意 put ... to the test 搭配。",
            }
        ]
    )
    expanded = generator.expand_flat_batch(flat)
    assert expanded.entries[0].senses[0].part_of_speech == "n."
    assert expanded.entries[0].collocations[0].meaning == "使经受检验"
    assert expanded.entries[0].word_family[0].form == "testing"


def test_render_documents_only_writes_complete_200_word_volume(
    generator: ModuleType, tmp_path: Path
) -> None:
    words = [
        generator.SourceWord(
            sequence=index,
            frequency=201 - index,
            word=f"word{index}",
            source_meaning=f"词{index}",
            alternate_spelling=None,
        )
        for index in range(1, 202)
    ]
    batches = generator.chunked(words, generator.BATCH_SIZE)
    for items in batches[:10]:
        destination = generator.batch_path(tmp_path, items)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(
                {"entries": [entry_payload(item.word) for item in items]},
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
    count = generator.render_documents(
        tmp_path,
        words,
        batches,
        model="LongCat-2.0",
        source_url="https://example.test/source.json",
    )
    assert count == 1
    document = tmp_path / "netem-vocabulary-0001-0200.md"
    assert document.exists()
    assert "## 1. word1" in document.read_text(encoding="utf-8")
    assert not (tmp_path / "netem-vocabulary-0201-0201.md").exists()
