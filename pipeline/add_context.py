"""Moves each shared case ("Questions 55 to 58  A 30-year-old ...") out of the answer option it was stuck to and attaches it,
as `context`, to every question in the group. Also removes stray 'Directions' fragments from answer options. Idempotent."""
import json, re
bank=json.load(open('question_bank.json')); by={q['id']:q for q in bank}
for q in bank: q.setdefault('context',None)
marker=re.compile(r'Questions?\s+(\d+)\s*(?:to|through|-|–|and)\s*(\d+)\s*[:.]?\s*',re.I)
groups=[]; cleaned=[]
for q in bank:
    if q['source_file_no']!=4: continue
    ch=q['id'].split('-')[1]
    fields=[('question',None)]+[('options',k) for k in q['options']]
    for kind,k in fields:
        txt=q['question'] if kind=='question' else q['options'][k]
        m=marker.search(txt)
        if not m: continue
        a,z=int(m.group(1)),int(m.group(2))
        scenario=re.sub(r'\s+',' ',txt[m.end():]).strip()
        keep=re.sub(r'\s+',' ',txt[:m.start()]).strip()
        if kind=='question': q['question']=keep
        else: q['options'][k]=keep
        members=[f'LIPP-{ch}-{n}' for n in range(a,z+1)]
        missing=[x for x in members if x not in by]
        assert not missing,(q['id'],missing)
        for x in members: by[x]['context']=scenario
        groups.append((q['id'],a,z,len(scenario),scenario[:70]))
# stray directions / headings stuck on the end of answer options (Comprehensive Review)
for q in bank:
    if q['source_file_no']!=1: continue
    for k,v in list(q['options'].items()):
        nv=re.sub(r'\s*DIRECTIONS\s*\(Questions[^)]*\)\s*:?.*$','',v,flags=re.S)
        nv=re.sub(r'\s*Questions\s+\d+\s*[-–]\s*\d+\s*:\s*$','',nv)
        if nv!=v: q['options'][k]=nv.strip(); cleaned.append((q['id'],k,v[len(nv):][:60]))
# The PDF's plain text drops superscripts: "34 weeks 1 day" is printed as 34 with a small 1, but extracted as "341". Fixed where checked against the page image.
for q in bank:
    if q['context'] and '341 weeks' in q['context']: q['context']=q['context'].replace('341 weeks','34¹ weeks')
json.dump(bank,open('question_bank.json','w'),indent=1,ensure_ascii=False)
print(len(groups),'case groups attached')
for g in groups: print(' ',g[0],'->',f'questions {g[1]}-{g[2]}',f'({g[3]} chars)',g[4])
print('cleaned stray fragments:',cleaned)
left=[q['id'] for q in bank for t in [q['question']]+list(q['options'].values()) if marker.search(t)]
print('leftover markers in question text:',left)
print('questions that now carry a case:',sum(1 for q in bank if q['context']))
