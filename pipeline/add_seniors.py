"""Adds the 34 questions from seniors_.docx to question_bank.json (idempotent) and checks them for duplicates against the whole bank."""
import json, re, subprocess, difflib
from collections import Counter
SRC="Seniors' Questions"
txt=subprocess.run(['pandoc','-t','plain','--wrap=none','/home/claude/sen/seniors_.docx'],capture_output=True,text=True).stdout
blocks=re.split(r'(?m)^Question\s+(\d+)\s*$',txt)
SUBJ={1:'Neuroanesthesia',2:'Respiratory Physiology and Critical Care',3:'Preoperative Evaluation',4:'Thoracic Anesthesia',5:'Ethics and Professional Practice',6:'Neuroanesthesia',7:'Postoperative Care and Complications',8:'Pediatric Anesthesia',9:'Fluid, Electrolyte, Acid-Base and Blood Transfusion',10:'Public Health and Community Health',11:'Pediatric Anesthesia',12:'Neuroanesthesia',13:'Research Methodology and Biostatistics',14:'Neuroanesthesia',15:'Management, Leadership and Health Systems',16:'Public Health and Community Health',17:'Postoperative Care and Complications',18:'Management, Leadership and Health Systems',19:'Pediatric Anesthesia',20:'Thoracic Anesthesia',21:'Management, Leadership and Health Systems',22:'Public Health and Community Health',23:'Respiratory Physiology and Critical Care',24:'Respiratory Physiology and Critical Care',25:'Systemic Diseases and Special Surgeries',26:'Neuroanesthesia',27:'Research Methodology and Biostatistics',28:'Ethics and Professional Practice',29:'Systemic Diseases and Special Surgeries',30:'Neuroanesthesia',31:'Airway Management',32:'Management, Leadership and Health Systems',33:'Ethics and Professional Practice',34:'Research Methodology and Biostatistics'}
def clean(s): return re.sub(r'\s+',' ',s).strip()
def fmt_expl(block):
    out=[]
    for l in block.split('\n'):
        m=re.match(r'^(\s*)-\s{2,}(.*)$',l)
        if m: out.append(('• ' if len(m.group(1))==0 else '   – ' if len(m.group(1))<=4 else '      – ')+clean(m.group(2)))
        elif l.strip(): out.append(clean(l))
    return '\n'.join(out)
recs=[]
for n,b in zip(blocks[1::2],blocks[2::2]):
    n=int(n)
    stem=clean(b[:re.search(r'(?m)^\s+[a-h]\.\s',b).start()])
    opts={m.group(1).upper():clean(m.group(2)) for m in re.finditer(r'(?m)^\s+([a-h])\.\s+(.*)$',b)}
    am=re.search(r'(?m)^Answer:\s*\(?([A-Ha-h])\)?\s*(.*)$',b)
    letter=am.group(1).upper(); atext=clean(am.group(2))
    expl=fmt_expl(b[re.search(r'(?m)^Explanation:\s*$',b).end():])
    flags=[]
    # does the answer text agree with the option the letter points to?
    ratio=difflib.SequenceMatcher(None,atext.lower(),opts[letter].lower()).ratio()
    others=max(difflib.SequenceMatcher(None,atext.lower(),v.lower()).ratio() for k,v in opts.items() if k!=letter)
    if others>ratio: flags.append('answer_text_matches_other_option')
    if n==3: flags.append('key_debatable_decreased_mucociliary_clearance_may_be_better')
    recs.append({'id':f'SEN-{n:03d}','source_pdf':SRC,'source_file_no':5,'source_question_number':n,'question':stem,'options':opts,'correct_answer':letter,'explanation':expl,'explanation_origin':'source','answer_origin':'source','subject':SUBJ[n],'topic':None,'subject_method':'manual','difficulty':None,'verification_status':'source_key_verified','duplicate_status':'none','duplicate_of':[],'needs_manual_review':bool(flags),'flags':flags,'group':None,'_ratio':round(ratio,2)})
print(len(recs),'parsed; weakest answer-text/option agreement:',sorted((r['_ratio'],r['id']) for r in recs)[:6])
print('flags:',[(r['id'],r['flags']) for r in recs if r['flags']])
for r in recs: r.pop('_ratio')
bank=[q for q in json.load(open('question_bank.json')) if q['source_file_no']!=5]
for q in bank:  # undo earlier duplicate links to source 5 so the run is repeatable
    q['duplicate_of']=[d for d in q['duplicate_of'] if not d['id'].startswith('SEN-')]
    q['duplicate_status']=max([d['kind'] for d in q['duplicate_of']],key=lambda k:{'exact':3,'likely':2,'possible':1}[k]) if q['duplicate_of'] else 'none'
# ---- duplicates between the new questions and everything already in the bank
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
norm=lambda q:re.sub(r'\s+',' ',(q['question']+' '+' '.join(q['options'].values())).lower())
allq=bank+recs
V=TfidfVectorizer(ngram_range=(1,2)).fit_transform([norm(q) for q in allq])
sim=cosine_similarity(V[len(bank):],V[:len(bank)])
rank={'exact':3,'likely':2,'possible':1,'none':0}
found=[]
for i,r in enumerate(recs):
    for j in sim[i].argsort()[::-1][:3]:
        s=float(sim[i][j])
        if s<0.80: break
        kind='exact' if s>=0.97 else 'likely' if s>=0.90 else 'possible'
        o=bank[j]
        r['duplicate_of'].append({'id':o['id'],'similarity':round(s,3),'kind':kind}); o['duplicate_of'].append({'id':r['id'],'similarity':round(s,3),'kind':kind})
        for x in (r,o):
            if rank[kind]>rank[x['duplicate_status']]: x['duplicate_status']=kind
        found.append((r['id'],o['id'],round(s,2),kind))
print('duplicate links with existing questions:',found)
bank+=recs
bank.sort(key=lambda x:(x['source_file_no'],x['id']))
json.dump(bank,open('question_bank.json','w'),indent=1,ensure_ascii=False)
print('bank now',len(bank),dict(Counter(q['source_file_no'] for q in bank)))
