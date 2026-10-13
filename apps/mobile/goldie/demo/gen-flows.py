# Writes the screenshot flows for both languages from one set of templates.
import os
L="launch: { ios: com.dastiyor.ios, android: com.dastiyor.app }"
CHAT="dastiyor://chat/demo-provider?partnerName=%D0%94%D0%B0%D0%BB%D0%B5%D1%80%20%D0%A8%D0%B0%D1%80%D0%B8%D0%BF%D0%BE%D0%B2&taskId=demo-task-sockets"
T={
 'ru':dict(p='store',home='Главная',my='Мои задания',resp='Отклики',tasks='Задания',featured='Рекомендуемые задания',
   titlePh='Кратко опишите что нужно сделать',descPh='Подробно опишите задание',offerPh='Опишите как вы выполните задание',pricePh='Например: 200',terms='Условия использования'),
 'tj':dict(p='store-tj',home='Асосӣ',my='Супоришҳои ман',resp='Посухҳо',tasks='Супоришҳо',featured='Супоришҳои тавсияшуда',
   titlePh='Мухтасар тавсиф диҳед',descPh='Муфассал тавсиф диҳед',offerPh='Тавсиф диҳед чӣ тавр иҷро мекунед',pricePh='Масалан: 200',terms=None),
}
TJ_SWITCH="""  - echo: Switch the app to Tajik on the Profile tab.
  - tool: open-url
    args: { url: 'dastiyor://profile' }
  - await: { visible: { text: English } }
  - tap: { text: Тоҷикӣ }
  - await: { visible: { text: Профил } }
"""
def url(u): return f"  - tool: open-url\n    args: {{ url: '{u}' }}\n"
def paste(ph,text): return f"  - tap: {{ text: '{ph}' }}\n  - tool: paste\n    args: {{ text: '{text}' }}\n"
HEADER="  - echo: The empty space beside the first field label; a tap there closes the keyboard so the whole form shows.\n  - tap: { x: 0.85, y: 0.172 }\n  - wait: 800\n"
def scenes(t):
    return [
     ('01-home','store-signin', f"  - tap: {{ text: '{t['home']}, tab' }}\n  - await: {{ visible: {{ text: {t['featured']} }} }}\n"),
     ('02-offers','store-signin', "  - echo: The signed-in customer's open task with three offers (ids fixed in goldie/demo/seed.mjs).\n"+url('dastiyor://task/demo-task-faucet')+"  - await: { visible: { text: Бахтиёр Одинаев } }\n"),
     ('03-chat','store-signin', "  - echo: The chat with the provider working on the customer's task.\n"+url(CHAT)+"  - await: { visible: { text: 'Спасибо, жду' } }\n"),
     ('04-provider','store-signin', "  - echo: A verified provider's public profile, with rating and reviews.\n"+url('dastiyor://provider/demo-provider')+"  - await: { visible: { text: Мадина Каримова } }\n"),
     ('05-create','store-signin', url('dastiyor://create-task')+f"  - await: {{ visible: {{ text: '{t['titlePh']}' }} }}\n  - await: {{ idle: true }}\n  - wait: 600\n"
        +paste(t['titlePh'],'Повесить телевизор на стену')+paste(t['descPh'],'Телевизор 55 дюймов, стена бетонная. Кронштейн есть, нужен свой инструмент.')+HEADER),
     ('06-my-tasks','store-signin', f"  - tap: {{ text: '{t['my']}, tab' }}\n  - await: {{ visible: {{ text: Заменить смеситель на кухне }} }}\n"),
     ('07-feed','store-signin-provider', f"  - echo: The provider's task search.\n  - tap: {{ text: '{t['tasks']}, tab' }}\n  - await: {{ visible: {{ text: Доставить холодильник }} }}\n"),
     ('08-respond','store-signin-provider', "  - echo: The provider's offer form for an open task.\n"+url('dastiyor://respond/demo-task-kitchen')+f"  - await: {{ visible: {{ text: '{t['offerPh']}' }} }}\n  - await: {{ idle: true }}\n  - wait: 600\n"
        +paste(t['offerPh'],'Соберу кухню за один день. Опыт 12 лет, свой инструмент, гарантия на работу.')+paste(t['pricePh'],'550')+HEADER),
     ('09-responses','store-signin-provider', f"  - tap: {{ text: '{t['resp']}, tab' }}\n  - await: {{ visible: {{ text: Установить четыре розетки }} }}\n"),
     ('10-settings','store-signin', "  - echo: The customer's Profile tab, scrolled to its settings (language, theme, notifications).\n"+url('dastiyor://profile')+"  - await: { visible: { text: English } }\n  - tool: gesture-swipe\n    args: { fromX: 0.5, fromY: 0.7, toX: 0.5, toY: 0.5, durationMs: 700 }\n  - wait: 800\n"),
    ]
os.chdir('.argent/flows')
for f in os.listdir('.'):
    if f.startswith(('store-0','store-tj-0')): os.remove(f)
for lang,t in T.items():
    for name,signin,body in scenes(t):
        y=f"steps:\n  - {L}\n  - run: {signin}\n"+(TJ_SWITCH if lang=='tj' else '')+body+"  - await: { idle: true }\n"
        open(f"{t['p']}-{name}.yaml",'w').write(y)
print(sorted(os.listdir('.')))
