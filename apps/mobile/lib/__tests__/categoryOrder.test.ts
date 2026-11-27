import { sortByOpenTasks } from '../categoryOrder';

describe('sortByOpenTasks', () => {
  it('puts busy categories first and keeps admin order on ties', () => {
    expect(sortByOpenTasks(['Ремонт', 'Уборка', 'Доставка', 'Красота'], { 'Уборка': 2, 'Доставка': 5, 'Красота': 2 }))
      .toEqual(['Доставка', 'Уборка', 'Красота', 'Ремонт']);
  });

  it('leaves the order alone without counts', () => {
    expect(sortByOpenTasks(['Ремонт', 'Уборка'], null)).toEqual(['Ремонт', 'Уборка']);
  });
});
