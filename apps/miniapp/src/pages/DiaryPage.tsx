import type { Me } from '../lib/api';

export function DiaryPage({ me }: { me: Me }) {
  const target = me.targetKcal;

  return (
    <main className="screen">
      <h1>Привет, {me.firstName ?? 'друг'}!</h1>
      <section className="card">
        <div className="muted">Сегодня</div>
        <div className="big">0 {target ? `/ ${target}` : ''} ккал</div>
        {!target && <p className="muted">Заполни профиль, чтобы рассчитать дневную норму.</p>}
      </section>
      <section className="actions">
        <button disabled>Добавить вручную</button>
        <button disabled>Найти в базе</button>
        <button disabled>Сканировать штрихкод</button>
        <button disabled>По фото</button>
      </section>
    </main>
  );
}
