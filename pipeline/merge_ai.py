import json,glob,importlib.util,re
bank=json.load(open('question_bank.json')); by={q['id']:q for q in bank}
n=0;m_expl=0;dis=0
for f in sorted(glob.glob('ai/batch*.py'))+sorted(glob.glob('ai/expl*.py')):
    spec=importlib.util.spec_from_file_location('b',f); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    pre=getattr(m,'PREFIX','ARBA')
    for num,ans,conf,expl in m.B:
        if pre=='ARBA':
            q=by[f"ARBA-{num:04d}"]
            if q['answer_origin']=='source': continue
            q['correct_answer']=ans; q['answer_origin']='ai_generated'; q['explanation']=expl; q['explanation_origin']='ai_generated'
            q['ai_confidence']=conf; q['verification_status']='ai_answer_unverified'; n+=1
        else:  # explanation-only files for questions that already have a source answer key
            qid=getattr(m,'IDFMT','EHPLE-{:03d}').format(num)
            q=by[qid]
            if q.get('explanation_origin')=='source': continue
            q['explanation']=expl; q['explanation_origin']='ai_generated'; q['ai_confidence']=conf
            if ans and q['correct_answer'] and ans!=q['correct_answer']:
                tag=f"ai_disagrees_with_source_key:{ans}"
                if tag not in q['flags']: q['flags'].append(tag)
                q['needs_manual_review']=True; q['verification_status']='source_key_needs_review'; dis+=1
            m_expl+=1
json.dump(bank,open('question_bank.json','w'),indent=1,ensure_ascii=False)
from collections import Counter
print('answers merged',n,'| explanations merged',m_expl,'| key disagreements',dis,'|',dict(Counter(q['verification_status'] for q in bank)))
