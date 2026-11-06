from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..activity import log_activity
from ..database import get_db
from ..security import get_current_user
from .matters import get_owned_matter

router = APIRouter(prefix="/api", tags=["tasks"])

Task = models.Task
TASK_ORDER = (Task.due_date.is_(None), Task.due_date, Task.id)


def get_owned_task(task_id: int, user: models.User, db: Session) -> Task:
    task = db.get(Task, task_id, options=[joinedload(Task.matter)])
    if task is None or task.matter.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found.")
    return task


@router.get("/tasks", response_model=list[schemas.TaskOut])
def list_tasks(
    done: bool | None = None,
    matter_id: int | None = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(Task)
        .join(Task.matter)
        .options(joinedload(Task.matter))
        .where(models.Matter.user_id == user.id)
        .order_by(*TASK_ORDER)
    )
    if done is not None:
        query = query.where(Task.done == done)
    if matter_id is not None:
        query = query.where(Task.matter_id == matter_id)
    return db.scalars(query).all()


@router.post(
    "/matters/{matter_id}/tasks",
    response_model=schemas.TaskOut,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    matter_id: int,
    body: schemas.TaskCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matter = get_owned_matter(matter_id, user, db)
    task = Task(matter=matter, title=body.title, due_date=body.due_date)
    db.add(task)
    log_activity(db, user, f"Added a task in {matter.title}: {task.title}", matter)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    body: schemas.TaskUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_owned_task(task_id, user, db)
    changes = body.model_dump(exclude_unset=True)
    finished_now = changes.get("done") is True and not task.done
    for field, value in changes.items():
        setattr(task, field, value)
    if finished_now:
        log_activity(db, user, f"Finished a task in {task.matter.title}: {task.title}", task.matter)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(get_owned_task(task_id, user, db))
    db.commit()
