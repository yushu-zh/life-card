import { DeltaList } from './DeltaList.tsx';
import type {
  FateResolutionStepViewModel,
  OpportunityResolutionStepViewModel,
  StatusResolutionStepViewModel,
  TurnResolutionFlowViewModel
} from '../../shared/types/ui.ts';

interface ResultFlowScreenProps {
  vm: TurnResolutionFlowViewModel;
  // 当前展示到第几个结果段。
  stepIndex: number;
  // 中间段的推进按钮文案。
  continueLabel: string;
  // 机会结果的描述小节标题。
  descriptionHeading: string;
  onNext: () => void;
}

// 结果流界面：按时间顺序逐段展示（机会 -> 后续变故 -> 状态），
// 每次只渲染一个结果卡片，不并列混排。
// 视觉对齐 docs/ui/reference/结果界面.png 与 命运事件界面.png。
export function ResultFlowScreen({
  vm,
  stepIndex,
  continueLabel,
  descriptionHeading,
  onNext
}: ResultFlowScreenProps) {
  const step = vm.steps[Math.min(stepIndex, vm.steps.length - 1)];
  const isLastStep = stepIndex >= vm.steps.length - 1;
  // 最后一段用 VM 给出的终态动作文案，中间段统一为“继续”。
  const actionLabel = isLastStep ? vm.nextAction.label : continueLabel;

  return (
    <div className="life-game__container">
      {step.kind === 'opportunity' && (
        <OpportunityStep step={step} descriptionHeading={descriptionHeading} />
      )}
      {step.kind === 'fate' && <FateStep step={step} />}
      {step.kind === 'status' && <StatusStep step={step} />}

      <button className="life-game__primary-button life-game__cta" onClick={onNext}>
        {actionLabel}
      </button>
    </div>
  );
}

// 机会事件结果：选择标题 + 结果等级、检定详情、结果描述、本次变化。
function OpportunityStep({
  step,
  descriptionHeading
}: {
  step: OpportunityResolutionStepViewModel;
  descriptionHeading: string;
}) {
  return (
    <div className="life-game__result-card">
      <div className="life-game__result-head">
        <h2 className="life-game__result-title">{step.title}</h2>
        <span className="life-game__result-grade">{step.gradeLabel}</span>
      </div>

      {(step.diceLabel || step.checkLabel || step.totalScoreLabel) && (
        <div className="life-game__result-checks">
          {step.diceLabel && (
            <div className="life-game__result-check-line">
              <DiceIcon />
              {step.diceLabel}
            </div>
          )}
          {step.checkLabel && (
            <div className="life-game__result-check-line">{step.checkLabel}</div>
          )}
          {step.totalScoreLabel && (
            <div className="life-game__result-check-line">{step.totalScoreLabel}</div>
          )}
        </div>
      )}

      <div className="life-game__result-body">
        <div className="life-game__section-title">{descriptionHeading}</div>
        {step.body.map((paragraph, index) => (
          <p key={index} className="life-game__result-paragraph">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="life-game__section-title">{step.deltaHeading}</div>
      <DeltaList deltas={step.deltas} />
    </div>
  );
}

// 后续变故结果：居中大标题 + “已触发命运事件”副提示、描述、数值变化、应变减免。
function FateStep({ step }: { step: FateResolutionStepViewModel }) {
  // mitigationLabel 形如“应变减免：幸福 -1”，拆成小节标题与内容行。
  const mitigation = step.mitigationLabel ? splitLabel(step.mitigationLabel) : null;

  return (
    <div className="life-game__result-card">
      <div className="life-game__result-head life-game__result-head--center">
        <h2 className="life-game__result-title">{step.title}</h2>
      </div>

      <div className="life-game__result-body">
        {step.body.map((paragraph, index) => (
          <p key={index} className="life-game__result-paragraph">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="life-game__section-title">{step.deltaHeading}</div>
      <DeltaList deltas={step.deltas} />

      {mitigation && (
        <>
          <div className="life-game__section-title" style={{ marginTop: 'var(--space-md)' }}>
            {mitigation.heading}
          </div>
          <div className="life-game__result-paragraph">已减免：{mitigation.content}</div>
        </>
      )}
    </div>
  );
}

// 状态结果：居中标题、触发原因与描述、本次数值变化；终局时给出明确结论。
function StatusStep({ step }: { step: StatusResolutionStepViewModel }) {
  return (
    <div className="life-game__result-card">
      <div className="life-game__result-head life-game__result-head--center">
        <h2 className="life-game__result-title">{step.title}</h2>
        {step.isTerminal && (
          <p className="life-game__result-subtitle" style={{ color: 'var(--danger)' }}>
            本局人生到此结束
          </p>
        )}
      </div>

      <div className="life-game__result-body">
        {step.body.map((paragraph, index) => (
          <p key={index} className="life-game__result-paragraph">
            {paragraph}
          </p>
        ))}
      </div>

      {step.deltas.length > 0 && (
        <>
          <div className="life-game__section-title">{step.deltaHeading}</div>
          <DeltaList deltas={step.deltas} />
        </>
      )}
    </div>
  );
}

// 把“标题：内容”形式的标签拆成标题与内容两段。
function splitLabel(label: string): { heading: string; content: string } {
  const separatorIndex = label.indexOf('：');
  if (separatorIndex === -1) {
    return { heading: label, content: '' };
  }
  return {
    heading: label.slice(0, separatorIndex),
    content: label.slice(separatorIndex + 1)
  };
}

// 检定详情行的小骰子图标。
function DiceIcon() {
  return (
    <svg
      className="life-game__result-dice-icon"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="5.5" r="1.2" fill="currentColor" />
      <circle cx="10.5" cy="10.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
