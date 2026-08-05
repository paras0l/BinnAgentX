from binnagent_api.vocabulary_dictionary import netem_vocabulary_dictionary


def test_reviewed_dictionary_loads_all_entries_and_supports_casefold_lookup() -> None:
    dictionary = netem_vocabulary_dictionary()

    first = dictionary.lookup("the")
    middle = dictionary.lookup("Capacity")
    last = dictionary.lookup("zoom")

    assert first is not None and first.sequence == 1
    assert middle is not None and middle.headword == "capacity"
    assert last is not None and last.sequence == 5530
    assert all(len(entry.note) <= 800 for entry in (first, middle, last))


def test_dictionary_rejects_phrases_and_ambiguous_casefold_collisions() -> None:
    dictionary = netem_vocabulary_dictionary()

    assert dictionary.lookup("not in the dictionary") is None
    assert dictionary.lookup("MAY") is None
    assert dictionary.lookup("may") is not None
    assert dictionary.lookup("May") is not None
