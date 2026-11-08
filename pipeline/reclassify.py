"""Second-pass subject classification for the two sources that have no chapter headings (Arba Minch, EHPLE).
Adds subjects for non-clinical content (research methods, public health, ethics/professionalism, management)."""
import json,re
from collections import Counter
b=json.load(open('question_bank.json'))
base={q['id']:q['subject'] for q in json.load(open('/home/claude/app/data/question_bank.json'))}  # subjects before any reclassification
for q in b:
    if q.get('subject_method') in ('keyword_auto','keyword_auto_v2'):
        q['subject']=base[q['id']]; q['subject_method']='keyword_auto'
NEW_PH='Public Health and Community Health'; NEW_MG='Management, Leadership and Health Systems'
RES='Research Methodology and Biostatistics'; ETH='Ethics and Professional Practice'
# EHPLE 157-200 were read one by one: it is a contiguous non-clinical block
ehple_ranges=[(157,170,RES),(171,178,NEW_PH),(179,190,ETH),(191,200,NEW_MG)]
CUES={
 RES:r"\b(researcher|study design|sample size|hypothesis|p-value|confidence interval|odds ratio|standard deviation|median|dependent variable|independent variable|cross-sectional|case-control|cohort|prevalence|incidence rate|sampling technique|cluster sampling|random sampling|sample population|questionnaire|data collection|specific objective|general objective|study population|experimental|correlation|bar graph|histogram)\b",
 NEW_MG:r"\b(leadership|leader|staffing|recruit|motivat|SWOT|conflict|mission statement|vision|budget|supervis|delegat|job satisfaction|department head|head of (the )?(anesthesia )?department|authoritarian|manager|management style|team members|organizational)\b",
 ETH:r"\b(informed consent|autonomy|beneficence|maleficence|confidentiality|ethical|dignity|respectful|malpractice|disclos|jehovah|competent patient|privacy|code of ethics|moral)\b",
 NEW_PH:r"\b(community|health education|epidemic|immuni[sz]ation|screening program|health belief|bed net|waste|hygiene|sanitation|surveillance|outbreak|public health)\b",
}
changed=Counter(); samples={}
for q in b:
    if q.get('subject_method')!='keyword_auto': continue
    old=q['subject']; new=None
    if q['id'].startswith('EHPLE-'):
        n=int(q['id'][6:])
        for a,z,s in ehple_ranges:
            if a<=n<=z: new=s
    if new is None:
        txt=q['question']+' '+' '.join(q['options'].values())
        scores={s:len(re.findall(rx,txt,re.I)) for s,rx in CUES.items()}
        best=max(scores,key=scores.get)
        # need two cue hits, or one hit in the stem alone when the question has no clinical vignette (no "-year-old")
        if scores[best]>=2 or (scores[best]>=1 and not re.search(r'\d+-(year|month|week|day)-old|patient|surgery|anesthe',q['question'],re.I)):
            new=best
    if new and new!=old:
        q['subject']=new; q['subject_method']='keyword_auto_v2'; changed[(old,new)]+=1
        samples.setdefault(new,[]).append((q['id'],q['question'][:90]))
json.dump(b,open('question_bank.json','w'),indent=1,ensure_ascii=False)
print(sum(changed.values()),'reclassified'); 
for s,l in samples.items():
    print('\n##',s,len(l))
    for x in l[:7]: print('  ',x)
print('\n',dict(Counter(q['subject'] for q in b).most_common()))
