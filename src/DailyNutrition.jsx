import { formatNumber, fraction, hasNumber, sumNumbers } from './numbers';
function ProgressRing({ label, value, unit, progress, color, target }) {
  return <div className="nutrition-ring" role="img" aria-label={`${label} ${hasNumber(value) ? formatNumber(value) + ' ' + unit : '未紀錄'}${target ? '，目標 ' + formatNumber(target) + ' g' : ''}`}>
    <div className="nutrition-ring-graphic">
      <svg viewBox="0 0 80 80" aria-hidden="true"><circle className="ring-track" cx="40" cy="40" r="33"/>{progress > 0 && <circle className={`ring-progress ${color}`} cx="40" cy="40" r="33" pathLength="100" strokeDasharray="100 100" strokeDashoffset={100 - progress * 100} transform="rotate(-90 40 40)"/>}</svg>
      <div className="ring-center"><span className="ring-value">{formatNumber(value)}</span><span className="ring-unit">{unit}</span></div>
    </div>
    <span className="ring-label">{label}</span>{target && <span className="ring-target">/ {formatNumber(target)} g</span>}
  </div>;
}
export default function DailyNutrition({ diet, calorieGoal, proteinGoal, isLarge }) {
  const calories = sumNumbers(diet, r => hasNumber(r.calories) ? r.calories : r.value);
  const protein = sumNumbers(diet, 'protein');
  const carbs = sumNumbers(diet, 'carbs'), fat = sumNumbers(diet, 'fat');
  const remaining = Math.max(0, calorieGoal - (calories ?? 0));
  return <div className={`daily-nutrition ${isLarge ? 'daily-nutrition-large' : ''}`}>
    <div className="daily-nutrition-values">
      <p className="intake-label">攝取熱量</p>
      <p className="intake-total"><strong>{formatNumber(calories)}</strong><span>/ {formatNumber(calorieGoal)} kcal</span></p>
      <p className="macro-strip">{hasNumber(carbs) && <span>碳水 {formatNumber(carbs)} g</span>}{hasNumber(fat) && <span>脂肪 {formatNumber(fat)} g</span>}</p>
    </div>
    <div className="daily-rings">
      <ProgressRing label="蛋白質" value={protein} unit="g" progress={fraction(protein, proteinGoal)} color="ring-protein" target={proteinGoal}/>
      <ProgressRing label="尚可攝取" value={remaining} unit="kcal" progress={fraction(remaining, calorieGoal)} color="ring-calories"/>
    </div>
  </div>;
}
