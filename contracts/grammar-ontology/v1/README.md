# Grammar ontology contract v1

`grammar-catalog.schema.json` validates the portable catalog shape. Runtime graph checks additionally
enforce unique IDs and aliases, valid relation targets, ID/version agreement, and acyclic
`REQUIRES` relations.

The bundled runtime catalog is:

`python/binnagent_domain/learning/data/grammar-catalog.v1.json`

Parser labels, model labels, CEFR levels, and exam-skill mappings are evidence or crosswalks. They
must not replace `construction_id`.
