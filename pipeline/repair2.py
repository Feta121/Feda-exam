import json,copy
b=json.load(open('question_bank.json')); by={q['id']:q for q in b}
if 'ARBA-0368' not in by:
    q=by['ARBA-0367']
    new=copy.deepcopy(q); new['id']='ARBA-0368'; new['source_question_number']=368
    new['question']='During laparoscopic cholecystectomy with CO2 insufflation, the primary reason for a rise in PaCO2 is'
    new['flags']=[f for f in new['flags'] if f!='maybe_figure']+['recovered_from_merged_record']
    q['question']='Goals for early Resuscitation in a Trauma patient are -: (A) Maintain systolic blood pressure of 80-100 mm Hg (B) Maintain Hematocrit of 25%-30% (C) Maintain core temp lower than 35°C (D) Maintain PT <= 14 sec'
    q['options']={}
    q['flags']=q['flags']+['options_missing_in_source_statements_only']
    q['needs_manual_review']=True; q['verification_status']='unverified_no_key'
    q['explanation']=None
    b.append(new)
    q=by['ARBA-0391']
    new=copy.deepcopy(q); new['id']='ARBA-0392'; new['source_question_number']=392
    new['question']='Pressure on the globe or any orbital contents can result in oculocardiac reflex with all the signs mentioned below except -:'
    new['flags']=[f for f in new['flags'] if f!='maybe_figure']+['recovered_from_merged_record']
    q['question']='Vital capacity equals to -:'
    q['options']={'A':'IRV','B':'IRV + TV + ERV','C':'IRV + ERV','D':'IRV + TV'}
    q['flags']=[f for f in q['flags'] if f!='maybe_figure']+['recovered_from_merged_record']
    b.append(new)
    # keep the bank ordered by id
    b.sort(key=lambda x:(x['source_file_no'],x['id']))
json.dump(b,open('question_bank.json','w'),indent=1,ensure_ascii=False)
by={q['id']:q for q in b}
print(by['ARBA-0368']['options'],'|',by['ARBA-0392']['options'],'|',by['ARBA-0391']['options'],'|',len([q for q in b if q['source_file_no']==2]))
