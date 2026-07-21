"use client";

import { BookOpenText, CheckCircle, Clock, GearSix, Plus, Sparkle } from "@phosphor-icons/react";

import type { PersonalizedTrainingMaterial } from "../lib/api";

interface SystemTrainingTask {
  title: string;
  description: string;
  actionLabel: string;
  statusLabel: string;
}

interface TrainingTaskQueueProps {
  materials: PersonalizedTrainingMaterial[];
  syncedContextCount: number;
  obsidianConfigurationChecked: boolean;
  obsidianConfigured: boolean;
  isGenerating: boolean;
  systemTask: SystemTrainingTask;
  onGenerate: () => void;
  onConfigureObsidian: () => void;
  onOpenSystemTask: () => void;
  onOpenMaterial: (material: PersonalizedTrainingMaterial) => void;
}

const STATUS_LABEL: Record<PersonalizedTrainingMaterial["status"], string> = {
  ready: "待训练",
  in_progress: "进行中",
  completed: "已完成",
};

function shortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "刚刚"
    : new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}

export function TrainingTaskQueue({
  materials,
  syncedContextCount,
  obsidianConfigurationChecked,
  obsidianConfigured,
  isGenerating,
  systemTask,
  onGenerate,
  onConfigureObsidian,
  onOpenSystemTask,
  onOpenMaterial,
}: TrainingTaskQueueProps) {
  return (
    <section className="training-queue" aria-labelledby="training-queue-title">
      <header className="training-queue-heading">
        <div>
          <p className="step-label">可选择的下一步</p>
          <h2 id="training-queue-title">训练任务队列</h2>
          <p>系统训练与笔记巩固材料都在这里。先选想读的材料，再进入训练。</p>
        </div>
        {obsidianConfigurationChecked ? (
          obsidianConfigured ? (
            <button
              type="button"
              className="quiet-button"
              disabled={isGenerating || syncedContextCount === 0}
              onClick={onGenerate}
            >
              <Plus size={16} weight="bold" />
              {isGenerating ? "正在生成并加入队列…" : "从 Obsidian 笔记生成新材料"}
            </button>
          ) : (
            <button type="button" className="quiet-button" onClick={onConfigureObsidian}>
              <GearSix size={16} /> 去配置 Obsidian
            </button>
          )
        ) : (
          <button type="button" className="quiet-button" disabled>
            正在检查 Obsidian…
          </button>
        )}
      </header>

      {obsidianConfigurationChecked && !obsidianConfigured ? (
        <p className="training-queue-notice">
          Obsidian 尚未完成配对或没有成功同步记录，配置好后即可生成个性化材料。
        </p>
      ) : obsidianConfigured && syncedContextCount === 0 ? (
        <p className="training-queue-notice">
          Obsidian 已连接；请先同步至少一篇授权笔记，再生成个性化材料。
        </p>
      ) : null}

      <div className="training-queue-list">
        <article className="training-queue-item system-task">
          <div className="training-queue-icon">
            <BookOpenText size={22} weight="duotone" />
          </div>
          <div>
            <span className="training-task-status">{systemTask.statusLabel}</span>
            <h3>{systemTask.title}</h3>
            <p>{systemTask.description}</p>
          </div>
          <button type="button" className="primary-button" onClick={onOpenSystemTask}>
            {systemTask.actionLabel}
          </button>
        </article>

        {materials.map((material) => (
          <article
            className={`training-queue-item personalized-task status-${material.status}`}
            key={material.material_id}
          >
            <div className="training-queue-icon">
              {material.status === "completed" ? (
                <CheckCircle size={22} weight="fill" />
              ) : material.status === "in_progress" ? (
                <Clock size={22} weight="duotone" />
              ) : (
                <Sparkle size={22} weight="duotone" />
              )}
            </div>
            <div>
              <span className="training-task-status">{STATUS_LABEL[material.status]}</span>
              <h3>{material.title}</h3>
              <p>
                个性化阅读 · {material.paragraphs.length} 段 · 综合 {material.source_context_count}{" "}
                篇笔记 · {shortDate(material.created_at)}
              </p>
            </div>
            <button
              type="button"
              className="quiet-button"
              disabled={!material.training_eligible}
              onClick={() => onOpenMaterial(material)}
            >
              {!material.training_eligible
                ? material.start_block_reason === "active_training"
                  ? "先继续当前训练"
                  : "先完成校准"
                : material.status === "in_progress"
                  ? "继续训练"
                  : material.status === "completed"
                    ? "再次训练"
                    : "选择并开始"}
            </button>
          </article>
        ))}
      </div>

      {materials.length === 0 ? (
        <div className="training-queue-empty">
          <Sparkle size={24} weight="duotone" />
          <div>
            <strong>队列里还没有个性化材料</strong>
            <p>生成后会保存在这里，不会混入学习资产索引。</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
