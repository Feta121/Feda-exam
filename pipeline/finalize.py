import json, re
from collections import Counter, defaultdict
r1=json.load(open('raw1.json')); r2=json.load(open('raw2.json')); r3=json.load(open('raw3.json')); r4=json.load(open('raw4.json'))
# ---------- manual patches (each is logged as a flag so reviewers can see it) ----------
def relabel(o,mapping,note):
    o['options']={mapping.get(k,k):v for k,v in o['options'].items()}
    o['flags']=[f for f in o['flags'] if not f.startswith('option_letters_irregular') and f!='fewer_than_4_options']+[note]
byn2={o['src_num']:o for o in r2}
relabel(byn2[330],{'E':'D'},'letter_relabeled_E_to_D_source_typo')
relabel(byn2[384],{'E':'D'},'letter_relabeled_E_to_D_source_typo')
o=byn2[447]; o['options']={'A':'Turn machine off for 30 minutes before induction','B':'Administer 100% oxygen for the first hour of the next case','C':'Avoid use of sevoflurane','D':'Change the CO2 absorbent'}
o['flags']=[f for f in o['flags'] if not f.startswith('option_letters')]+['letter_relabeled_second_A_to_D_source_typo']
o=byn2[455]; o['options']={'A':'Cross connection','B':'Excessive pressure','C':'Contamination of gases','D':'Inadequate pressure'}
o['flags']=[f for f in o['flags'] if not f.startswith('option_letters')]+['option_marker_repaired_C']
o=byn2[683]; o['options']={'A':'1','B':'2','C':'3','D':'4','E':'5'}
o['flags']=[f for f in o['flags'] if not f.startswith('option_letters')]+['letters_relabeled_source_typo_B_B_C_E','maybe_figure']
o=byn2[388]; o['question']='Which of the following occurs in venous air embolism -:'
o['options']={'A':'Increase in ETCO2','B':'Mill wheel murmur','C':'PA catheter can recognize Paradoxical VAE','D':'CVC in SVC can aspirate more air than in right atrium'}
o['flags']=[f for f in o['flags'] if not f.startswith('option_letters')]+['option_marker_repaired_S_to_C']
o=byn2[130]; o['options']={'A':'Two-hour Plasma glucose greater than 126 mg/dl','B':'Hemoglobin A1c less than 6.5 percent','C':'Fasting Blood Sugar greater than 126 mg/dl','D':'Random Blood Sugar greater than 126 mg/dl'}
o['flags']=[f for f in o['flags'] if f!='options_not_parsed']+['option_marker_repaired']
o=byn2[290]; o['options']={'A':"A preoperative Allen's test would have predicted this complication",'B':'Stellate ganglion block should be performed','C':'This complication would have been less likely with an 18-gauge catheter','D':'The pulse will likely return'}
o['flags']=[f for f in o['flags'] if f!='options_not_parsed']+['letters_reconstructed_from_line_order_source_lost_labels']
byn2[174]['flags']=[f for f in byn2[174]['flags'] if not f.startswith('option_letters')]+['source_has_only_3_options']
byn2[648]['flags'].append('stem_is_single_word_in_source')
byn1={o['src_num']:o for o in r1}
# file 1: 995-1001 two option lists printed after both groups
lst1={'A':'Hypokalemia','B':'Hyperkalemia','C':'Hyponatremia','D':'Hypercalcemia'}
lst2={'A':'3 days','B':'7 days','C':'21 days','D':'Life of platelet'}
for n in (995,996,997):
    byn1[n]['options']=dict(lst1); byn1[n]['flags']=[f for f in byn1[n]['flags'] if not f.startswith('matching_options_missing')]+['matching_options_assigned_manually']
for n in (998,999,1000,1001):
    byn1[n]['options']=dict(lst2); byn1[n]['flags']=[f for f in byn1[n]['flags'] if not f.startswith('matching_options_missing')]+['matching_options_assigned_manually']
byn1[90]['question']='[Matching] Jackson-Rees system'; byn1[90]['flags']=['question_text_partially_located','matching_options_missing_figure_or_unparsed']
# file 4 manual
byn4={o['src_num']:o for o in r4}
for k in ('1.92','20.11'):
    byn4[k]['flags']=[f for f in byn4[k]['flags'] if f!='fewer_than_4_options']+['source_option_C_missing_in_book']
for k in ('12.40','18.14'):
    byn4[k]['flags']=['figure_required_options_in_image']
# ---------- subject taxonomy ----------
S=['General Anesthesia','Airway Management','Anesthesia Equipment and Monitoring','Pharmacology','Respiratory Physiology and Critical Care','Cardiovascular Anesthesia and Physiology','Fluid, Electrolyte, Acid-Base and Blood Transfusion','Regional Anesthesia','Pain Management','Obstetric Anesthesia','Pediatric Anesthesia','Neuroanesthesia','Thoracic Anesthesia','Systemic Diseases and Special Surgeries','Postoperative Care and Complications','Preoperative Evaluation','Research Methodology and Biostatistics','Ethics and Professional Practice','Other']
chmap1={'Anesthesia Equipment and Physics':'Anesthesia Equipment and Monitoring','Respiratory Physiology and Critical Care Medicine':'Respiratory Physiology and Critical Care','Pharmacology and Pharmacokinetics of Intravenous Drugs':'Pharmacology','Pharmacology and Pharmacokinetics of Volatile Anesthetics':'Pharmacology','Blood Products, Transfusion, and Fluid Therapy':'Fluid, Electrolyte, Acid-Base and Blood Transfusion','General Anesthesia':'General Anesthesia','Pediatric Physiology and Anesthesia':'Pediatric Anesthesia','Obstetric Physiology and Anesthesia':'Obstetric Anesthesia','Neurologic Physiology and Anesthesia':'Neuroanesthesia','Anatomy, Regional Anesthesia, and Pain Management':'Regional Anesthesia','Cardiovascular Physiology and Anesthesia':'Cardiovascular Anesthesia and Physiology'}
chmap4={'Perioperative Evaluation and Management':'Preoperative Evaluation','Airway Management':'Airway Management','Anesthesia Machine':'Anesthesia Equipment and Monitoring','Patient Monitoring':'Anesthesia Equipment and Monitoring','Fluid Management and Blood Transfusion':'Fluid, Electrolyte, Acid-Base and Blood Transfusion','Anesthetic Pharmacology':'Pharmacology','Spinal and Epidural Anesthesia':'Regional Anesthesia','Peripheral Nerve Blocks':'Regional Anesthesia','Pain Management':'Pain Management','Orthopedic Anesthesia':'Systemic Diseases and Special Surgeries','Cardiovascular Anesthesia':'Cardiovascular Anesthesia and Physiology','Thoracic Anesthesia':'Thoracic Anesthesia','Neuroanesthesia':'Neuroanesthesia','Gastrointestinal, Liver, and Renal Diseases':'Systemic Diseases and Special Surgeries','Endocrine Diseases':'Systemic Diseases and Special Surgeries','Ophthalmic, Ear, Nose, and Throat Surgery':'Systemic Diseases and Special Surgeries','Obstetric Anesthesia':'Obstetric Anesthesia','Pediatric Anesthesia':'Pediatric Anesthesia','Critical Care':'Respiratory Physiology and Critical Care','Postoperative Anesthesia Care':'Postoperative Care and Complications','Miscellaneous Topics':'Other'}
KW={
'Obstetric Anesthesia':r'parturient|cesarean|caesarean|labor\b|labour|pregnan|preeclampsia|eclampsia|obstetric|placenta|uterine|postpartum|gestation|epidural analgesia for labo',
'Pediatric Anesthesia':r'\binfant|neonat|child\b|children|pediatric|paediatric|newborn|premature|\bkg\b.*year-old|\d-year-old (boy|girl)|\d-month-old|\d-week-old',
'Neuroanesthesia':r'intracranial|craniotomy|cerebral|\bICP\b|neurosurg|brain|head injury|subarachnoid|stroke|seizure|cerebrospinal|\bCSF\b',
'Thoracic Anesthesia':r'one-lung|lung isolation|double-lumen|thoracotomy|pneumonectomy|lobectomy|thoracic surg|hypoxic pulmonary vasoconstriction|bronchopleural|mediastin',
'Cardiovascular Anesthesia and Physiology':r'cardiac|heart|myocard|coronary|aortic|mitral|valve|cardiopulmonary bypass|arrhythm|ECG|hypertension|hypotension|vasopressor|inotrop|cardiac output|stroke volume|atrial|ventricular',
'Regional Anesthesia':r'spinal|epidural|subarachnoid block|nerve block|brachial plexus|axillary|interscalene|caudal|local anesthetic|bupivacaine|lidocaine|ropivacaine|intrathecal|neuraxial|dermatome|femoral nerve|sciatic',
'Pain Management':r'\bpain\b|analgesi|opioid|neuropath|complex regional|chronic pain|nsaid|neuralgia|WHO ladder',
'Airway Management':r'airway|intubat|laryngoscop|mallampati|laryngeal mask|\bLMA\b|tracheal tube|endotracheal|extubat|cricoid|difficult mask|tracheostomy|bronchoscop',
'Anesthesia Equipment and Monitoring':r'vaporizer|flowmeter|circle system|absorber|soda lime|capnograph|pulse oximet|monitor|breathing circuit|mapleson|cylinder|pipeline|ventilator|anesthesia machine|rotameter|BIS\b|nerve stimulator|train-of-four|transducer|electrocautery|laser|fire\b',
'Fluid, Electrolyte, Acid-Base and Blood Transfusion':r'transfus|blood product|packed red|platelet|plasma|crystalloid|colloid|saline|ringer|hyperkal|hypokal|hypona|hypernat|hypocalc|acidosis|alkalosis|acid-base|bicarbonate|anion gap|fluid|dextrose|albumin|hemoglobin|hematocrit|coagul|heparin|massive transfusion',
'Respiratory Physiology and Critical Care':r'FRC|functional residual|compliance|dead space|shunt|ventilation|perfusion|oxygen|PaO2|PaCO2|lung|alveol|ARDS|pneumonia|sepsis|ICU|intensive care|mechanical ventilation|respirat|COPD|asthma|bronch',
'Pharmacology':r'MAC\b|minimum alveolar|volatile|isoflurane|sevoflurane|desflurane|halothane|nitrous|propofol|thiopental|thiopentone|ketamine|etomidate|midazolam|benzodiazep|succinylcholine|rocuronium|vecuronium|atracurium|neuromuscular|neostigmine|sugammadex|dexmedetomidine|pharmacokinetic|half-life|clearance|volume of distribution|opioid|fentanyl|morphine|naloxone|receptor|metabolism',
'Postoperative Care and Complications':r'postoperative|post-anesthesia|PACU|recovery room|emergence|shivering|PONV|nausea and vomiting|awareness|malignant hyperthermia|dantrolene|delirium|residual',
'Preoperative Evaluation':r'preoperative|pre-anesthetic|preanesthetic|ASA (physical|class)|NPO|fasting|premedication|risk assessment|fitness|ASA \w+',
'Research Methodology and Biostatistics':r'sample size|prevalence|hypothesis|p-value|confidence interval|study design|cohort|case-control|randomized|sensitivity|specificity|bias|variable|mean|median|standard deviation|investigator|questionnaire|research',
'Ethics and Professional Practice':r'consent|ethic|confidential|autonomy|beneficence|malpractice|competent|legal|guardian|Jehovah|DNR|brain death',
'Systemic Diseases and Special Surgeries':r'diabet|thyroid|adrenal|pheochromo|renal failure|hepatic|cirrhosis|liver|kidney|dialysis|trauma|burn|orthopedic|fracture|laparoscop|bariatric|obes|ophthalm|strabismus|tonsillectomy|ENT\b|myasthenia|muscular dystrophy|geriatric|elderly|transplant|TURP|cataract',
'General Anesthesia':r'general anesthesia|induction|maintenance of anesthesia|stages of anesthesia|rapid sequence|TIVA|balanced anesthesia|depth of anesthesia'}
ORDER=['Obstetric Anesthesia','Pediatric Anesthesia','Neuroanesthesia','Thoracic Anesthesia','Research Methodology and Biostatistics','Ethics and Professional Practice','Pain Management','Regional Anesthesia','Airway Management','Anesthesia Equipment and Monitoring','Fluid, Electrolyte, Acid-Base and Blood Transfusion','Cardiovascular Anesthesia and Physiology','Pharmacology','Respiratory Physiology and Critical Care','Postoperative Care and Complications','Preoperative Evaluation','Systemic Diseases and Special Surgeries','General Anesthesia']
def kw_subject(text):
    best=None;bs=0
    for i,sub in enumerate(ORDER):
        n=len(re.findall(KW[sub],text,re.I))
        score=n*(1.0)+ (0.01*(len(ORDER)-i))   # tie-break by priority order
        if n>0 and score>bs: best,bs=sub,score
    return best or 'Other'
def refine_f1_regional(q):
    t=q['question']+' '+' '.join(q['options'].values())
    if re.search(KW['Pain Management'],t,re.I) and not re.search(r'spinal|epidural|block',t,re.I): return 'Pain Management'
    return 'Regional Anesthesia'
bank=[]
def add(o,prefix,idx,subject,topic,method):
    o=dict(o)
    flags=list(o.get('flags',[]))
    has_ans=bool(o.get('answer'))
    qid=f"{prefix}-{idx}"
    ok_opts=len(o.get('options',{}))>=2
    status='source_key_verified' if (has_ans and 'answer_not_in_options' not in flags and ok_opts) else ('source_key_needs_review' if has_ans else 'unverified_no_key')
    expl_src='source' if o.get('explanation') else None
    bank.append({'id':qid,'source_pdf':o['source'],'source_file_no':o['src_file'],'source_question_number':o['src_num'],'question':o['question'],'options':o['options'],'correct_answer':o.get('answer'),'explanation':o.get('explanation'),'explanation_origin':expl_src,'answer_origin':'source' if has_ans else None,'subject':subject,'topic':topic,'subject_method':method,'difficulty':None,'verification_status':status,'duplicate_status':'none','duplicate_of':[],'needs_manual_review':bool([f for f in flags if f not in ('maybe_figure',)]) or not ok_opts,'flags':flags,'group':o.get('group')})
for o in r1:
    sub=chmap1.get(o['chapter'],'Other') if o.get('chapter') else 'Other'
    if o.get('chapter')=='Anatomy, Regional Anesthesia, and Pain Management': sub=refine_f1_regional(o)
    add(o,'CR',f"{o['src_num']:04d}",sub,o.get('chapter'),'source_chapter')
for o in r2:
    t=o['question']+' '+' '.join(o['options'].values())
    add(o,'ARBA',f"{o['src_num']:04d}",kw_subject(t),None,'keyword_auto')
for o in r3:
    t=o['question']+' '+' '.join(o['options'].values())
    add(o,'EHPLE',f"{o['src_num']:03d}",kw_subject(t),None,'keyword_auto')
for o in r4:
    sub=chmap4[o['chapter']]
    if o['chapter']=='Miscellaneous Topics': sub=kw_subject(o['question']+' '+' '.join(o['options'].values()))
    add(o,'LIPP',o['src_num'].replace('.','-'),sub,o['chapter'],'source_chapter')
# ---------- duplicate detection (TF-IDF cosine on question + options text) ----------
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
def norm(q): return re.sub(r'\s+',' ',(q['question']+' '+' '.join(q['options'].values())).lower())
texts=[norm(q) for q in bank]
V=TfidfVectorizer(ngram_range=(1,2),min_df=1,stop_words=None).fit_transform(texts)
pairs=[]
N=len(bank)
for start in range(0,N,500):
    sim=cosine_similarity(V[start:start+500],V)
    for i in range(sim.shape[0]):
        gi=start+i
        for j in np.where(sim[i]>=0.80)[0]:
            if j>gi: pairs.append((gi,int(j),float(sim[i][j])))
for gi,gj,s in pairs:
    a,b=bank[gi],bank[gj]
    kind='exact' if s>=0.97 else 'likely' if s>=0.90 else 'possible'
    for x,y in ((a,b),(b,a)):
        x['duplicate_of'].append({'id':y['id'],'similarity':round(s,3),'kind':kind})
        rank={'exact':3,'likely':2,'possible':1,'none':0}
        cur=x['duplicate_status']
        if rank[kind]>rank.get(cur,0): x['duplicate_status']=kind
# conflicting answer keys among duplicates
conflict=[]
for gi,gj,s in pairs:
    a,b=bank[gi],bank[gj]
    if s>=0.90 and a['correct_answer'] and b['correct_answer']:
        # compare answer text, since letters may be reordered
        ta=a['options'].get(a['correct_answer'],'').lower().strip(); tb=b['options'].get(b['correct_answer'],'').lower().strip()
        if ta and tb and ta!=tb: conflict.append((a['id'],b['id'],round(s,3)))
json.dump(bank,open('question_bank.json','w'),indent=1,ensure_ascii=False)
# ---------- report ----------
rep={'total':len(bank),'per_file':{}}
for fn,name in ((1,'A Comprehensive Review 1001.pdf'),(2,'Arba Minch University Mock Exams 2025.pdf'),(3,'EHPLE Practice Test 2025.pdf'),(4,"Lippincott's 1001.pdf")):
    q=[x for x in bank if x['source_file_no']==fn]
    rep['per_file'][name]={'extracted':len(q),'with_source_answer_key':sum(1 for x in q if x['correct_answer']),'without_key':sum(1 for x in q if not x['correct_answer']),'with_source_explanation':sum(1 for x in q if x['explanation']),'without_explanation':sum(1 for x in q if not x['explanation']),'needs_manual_review':sum(1 for x in q if x['needs_manual_review']),'maybe_figure':sum(1 for x in q if 'maybe_figure' in x['flags'] or any(f.startswith('figure') for f in x['flags']))}
rep['with_key_total']=sum(1 for x in bank if x['correct_answer']); rep['without_key_total']=sum(1 for x in bank if not x['correct_answer'])
rep['without_explanation_total']=sum(1 for x in bank if not x['explanation'])
rep['needs_manual_review_total']=sum(1 for x in bank if x['needs_manual_review'])
rep['duplicates']={k:sum(1 for x in bank if x['duplicate_status']==k) for k in ('exact','likely','possible')}
rep['duplicate_pairs_total']=len(pairs); rep['duplicate_pairs_by_kind']=dict(Counter('exact' if s>=0.97 else 'likely' if s>=0.90 else 'possible' for _,_,s in pairs))
rep['cross_source_pairs']=sum(1 for gi,gj,s in pairs if bank[gi]['source_file_no']!=bank[gj]['source_file_no'] and s>=0.90)
rep['duplicate_pairs_with_conflicting_keys']=conflict
rep['subjects']=dict(Counter(x['subject'] for x in bank).most_common())
rep['flag_counts']=dict(Counter(f.split(':')[0] for x in bank for f in x['flags']).most_common())
rep['source_numbering_gaps_file2']=[291,292,293,294,295,296,297,298,299,368,392]
json.dump(rep,open('extraction_report.json','w'),indent=1,ensure_ascii=False)
print(json.dumps(rep,indent=1,ensure_ascii=False)[:5000])
