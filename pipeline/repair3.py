import json
b=json.load(open('question_bank.json')); by={q['id']:q for q in b}
for n in (902,903,904,905):
    q=by[f'CR-{n:04d}']
    if q['options']:
        q['options']={}
        q['flags']=[f for f in q['flags'] if f!='matching_group_shared_options']+['matching_options_missing_wrong_shared_list_removed']
        q['needs_manual_review']=True; q['verification_status']='source_key_needs_review'
for qid in ['CR-0087','CR-0088','CR-0090','CR-0378','CR-0379','CR-0380','CR-0898','CR-0899','CR-0900']:
    q=by[qid]
    if 'figure_options_not_in_text' not in q['flags']: q['flags'].append('figure_options_not_in_text')
    q['needs_manual_review']=True
for qid,note in (('ARBA-0645','figure_required'),('ARBA-0683','figure_required'),('ARBA-0710','figure_required'),('ARBA-0367','options_missing_in_source')):
    q=by[qid]
    if note not in q['flags']: q['flags'].append(note)
    q['needs_manual_review']=True
json.dump(b,open('question_bank.json','w'),indent=1,ensure_ascii=False)
