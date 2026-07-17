import os

# Never inherit sibling-project credentials or trigger real email/model calls in tests.
os.environ["BINNAGENT_ENV"] = "test"
os.environ["BINNAGENT_LEARNER_IDENTITY_ADAPTER"] = "synthetic"
os.environ["BINNAGENT_MODEL_ADAPTER"] = "deterministic_fixture"
os.environ["BINNAGENT_ENABLE_REMOTE_MODEL_CALLS"] = "false"
