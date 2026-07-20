from __future__ import annotations

from prefect import task


@task(
    name="BinnAgentX content pack generation",
    description=(
        "Orchestrates one content-pack run. BinnAgentX remains authoritative for "
        "review gates and publishing."
    ),
    persist_result=False,
    retries=0,
    log_prints=True,
)
async def content_generation_task(job_id: str) -> str:
    # Import at execution time so API dispatch does not initialize the worker runtime.
    from binnagent_worker.main import process_content_job

    return await process_content_job(job_id)


def submit_content_generation_job(job_id: str) -> str:
    future = content_generation_task.delay(job_id)
    return str(future.task_run_id)
