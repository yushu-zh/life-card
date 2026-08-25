import { AgeTrack } from './AgeTrack.tsx';
import { EventCard } from './EventCard.tsx';
import { RiskHintBar } from './RiskHintBar.tsx';
import { StatGrid } from './StatGrid.tsx';
import type { TurnOverviewViewModel } from '../../shared/types/ui.ts';

interface TurnOverviewScreenProps {
  vm: TurnOverviewViewModel;
  onSelectCard: (slotIndex: number) => void;
  onReroll: () => void;
}

// 回合主界面：顶部状态行（年龄/周期/回合 + 换牌小按钮）、人生刻度带、
// 状态面板、三张事件卡（主视觉）、按需出现的风险提示行。
// 视觉对齐 docs/ui/reference/事件界面.png。
export function TurnOverviewScreen({ vm, onSelectCard, onReroll }: TurnOverviewScreenProps) {
  const { header } = vm;

  return (
    <div className="life-game__container life-game__container--turn">
      {/* 顶部状态行：年龄 / 周期 / 回合居中，换牌入口在右侧轻量展示 */}
      <div className="life-game__turn-header">
        <span />
        <div className="life-game__turn-header-title">
          {header.ageLabel}｜{header.cycleLabel}·{header.turnLabel}
        </div>
        <div className="life-game__turn-header-action">
          <button
            className="life-game__secondary-button"
            disabled={!header.reroll.canUse}
            onClick={onReroll}
            title={header.reroll.helperText}
          >
            {header.reroll.label}
          </button>
        </div>
      </div>

      <AgeTrack
        marks={header.ageTrackMarks}
        currentAge={header.age}
        label={header.ageTrackLabel}
      />

      <StatGrid stats={vm.stats} />
      <RiskHintBar hint={vm.riskHint} />

      <div className="life-game__cards">
        {vm.cards.map((card) => (
          <EventCard key={card.slotIndex} card={card} onSelect={onSelectCard} />
        ))}
      </div>
    </div>
  );
}
