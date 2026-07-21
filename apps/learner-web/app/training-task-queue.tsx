"use client";

import { useState } from "react";

import { BookOpenText, CheckCircle, Clock, GearSix, Plus, Sparkle } from "@phosphor-icons/react";

import type { PersonalizedMaterialGenerationInput, PersonalizedTrainingMaterial } from "../lib/api";

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
  onGenerate: (input: PersonalizedMaterialGenerationInput) => void;
  onConfigureObsidian: () => void;
  onOpenSystemTask: () => void;
  onOpenMaterial: (material: PersonalizedTrainingMaterial) => void;
  onRetryMaterial: (material: PersonalizedTrainingMaterial) => void;
}

const STATUS_LABEL: Record<PersonalizedTrainingMaterial["status"], string> = {
  requested: "等待生成",
  generating: "正在生成",
  validating: "正在校验",
  ready: "待训练",
  in_progress: "进行中",
  completed: "已完成",
  generation_failed: "生成失败",
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
  onRetryMaterial,
}: TrainingTaskQueueProps) {
  const [goal, setGoal] = useState("综合巩固近期笔记");
  const [kinds, setKinds] = useState<PersonalizedMaterialGenerationInput["kinds"]>([]);
  const toggleKind = (kind: PersonalizedMaterialGenerationInput["kinds"][number]) => {
    setKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    );
  };
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
              onClick={() => onGenerate({ goal, kinds })}
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

      {obsidianConfigured ? (
        <details className="personalized-generation-options">
          <summary>定制本次材料</summary>
          <label>
            <span>本次目标</span>
            <input
              value={goal}
              maxLength={240}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="例如：巩固让步结构，并练习主旨判断"
            />
          </label>
          <fieldset>
            <legend>优先使用的笔记类型（不选则自动混合）</legend>
            {(
              [
                ["vocabulary", "词汇"],
                ["grammar", "语法"],
                ["reading_skill", "阅读"],
                ["writing_expression", "写作表达"],
              ] as const
            ).map(([kind, label]) => (
              <label key={kind}>
                <input
                  type="checkbox"
                  checked={kinds.includes(kind)}
                  onChange={() => toggleKind(kind)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <p>系统会优先选择近期未使用的匹配笔记，避免连续生成相似材料。</p>
        </details>
      ) : null}

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
              ) : ["requested", "generating", "validating", "in_progress"].includes(
                  material.status,
                ) ? (
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
              disabled={!material.training_eligible && material.status !== "generation_failed"}
              onClick={() =>
                material.status === "generation_failed"
                  ? onRetryMaterial(material)
                  : onOpenMaterial(material)
              }
            >
              {!material.training_eligible
                ? material.start_block_reason === "material_not_ready"
                  ? material.status === "generation_failed"
                    ? "重新生成"
                    : "生成处理中"
                  : material.start_block_reason === "active_training"
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
