import json,sys
b=json.load(open('question_bank.json'))
pre=sys.argv[1]; a=int(sys.argv[2]); z=int(sys.argv[3])
for q in b:
    if q['id'].startswith(pre+'-') and q['id'].split('-')[1].isdigit() and a<=int(q['id'].split('-')[1])<=z:
        print(q['id'].split('-')[1].lstrip('0'),'|',q['question'][:650], '[ANS:%s]'%q['correct_answer'] if q['correct_answer'] else '')
        print('   '+' || '.join(f"{k}.{v[:110]}" for k,v in q['options'].items()))
