import os
import json
import asyncio
import httpx
import certifi
import requests
from dotenv import load_dotenv
from fastapi import FastAPI,HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from supabase import create_client
import traceback


load_dotenv()


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
DEEPFAKE_API_USER = os.getenv("DEEPFAKE_API_USER")
DEEPFAKE_API_SECRET = os.getenv("DEEPFAKE_API_SECRET")


supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client=AsyncOpenAI(api_key=OPENAI_API_KEY)


app=FastAPI(title="Backend TruthLens")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#definim ce trebuie sa primeasca endpointul
class AnalyzeTextRequest(BaseModel):
    text:str=Field(min_length=20,max_length=15000)


#funcia afla ip-ul real al userului
def get_client_ip(request: Request):
    #din header ul special al serverului extrage ip-ul userului
    forwarded_for=request.headers.get("x-forwarded-for")
    if forwarded_for:
        #selectam doar ip-ul real nu proxy-uri
        return forwarded_for.split(",")[0].strip()


    #in caz de esec luam ip-ul requestului
    if request.client:
        return request.client.host


    return None


#functia determina tara userului pe baza ip-ului
async def detect_country(request: Request):
    ip = get_client_ip(request)


    if not ip or ip in ("127.0.0.1", "::1", "localhost"):
        return {
            "country_code": "RO",
            "country_name": "Romania",
        }


    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"http://ip-api.com/json/{ip}?fields=status,country,countryCode"
            )
            response.raise_for_status()
            data = response.json()


        if data.get("status") == "success":
            return {
                "country_code": data.get("countryCode", "UN"),
                "country_name": data.get("country", "Unknown"),
            }


    except Exception:
        pass


    return {
        "country_code": "UN",
        "country_name": "Unknown",
    }


#scoate backtickurile din raspunsurile api-ului open ai
def parse_json(content: str):
    content = content.strip()




    if content.startswith("```json"):
        content = content.replace("```json", "", 1).rstrip("```").strip()
    elif content.startswith("```"):
        content = content.replace("```", "", 1).rstrip("```").strip()




    return json.loads(content)


#folosind open ai api extragem faptele veridice din textul primit
async def extract_claims(text: str):
    
    prompt = f"""
    Extrage 3 până la 5 afirmații factuale, verificabile, din textul de mai jos.Ignoră opiniile și afirmațiile emoționale vagi.
    Returnează DOAR JSON valid, în acest format:
    {{  
        "claims": [
        "afirmația 1",    
        "afirmația 2",    
        "afirmația 3"  
        ]
    }}
    IMPORTANT:- Toate afirmațiile trebuie formulate în limba română.- Nu include text în afara JSON-ului.
    Text:{text[:10000]}
    """


    response=await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "Ești un asistent de fact-checking. Răspunzi exclusiv în limba română."
            },
            {
                "role": "user",
                "content": prompt,
            },
        ]
    )


    content=response.choices[0].message.content or "{}"
    data=parse_json(content)


    claims=data.get("claims", [])
    if not isinstance(claims, list):
        return []
   
    #colectam datele curate
    clean_claims=[]
    for claim in claims:
        if isinstance(claim,str) and claim.strip():
            clean_claims.append(claim.strip())


    return clean_claims[:5]


#functia foloseste tavily,unbrowser web pt agenti ai pt a selecta cele mai noi date despre facturi
async def search_claim(claim: str):
    #folosind tavily cautam avanstat sursele cele mai noi si corecte
    payload={
        "api_key": TAVILY_API_KEY,
        "query": claim,
        "search_depth": "advanced",
        "max_results": 5,
        "include_answer": False,
        "include_raw_content": False,
    }


    async with httpx.AsyncClient(timeout=20.0) as client:
        #apellam printr un https request api ul tavily pentru a colecta datele cele mai noi si de increder
        response =await client.post(
            "https://api.tavily.com/search",
            json=payload,
        )
        response.raise_for_status()
        data=response.json()


    sources=[]
    for item in data.get("results", []):
        sources.append(
            {
                "title": item.get("title", "").strip(),
                "url": item.get("url", "").strip(),
                "snippet": item.get("content", "").strip(),
            }
        )


    return sources


#formatam sursele pentru a asigura uniformitate
def format_sources(sources):
    lines = []




    for i, source in enumerate(sources, start=1):
        lines.append(
            f"{i}. Title: {source['title']}\n"
            f"   URL: {source['url']}\n"
            f"   Snippet: {source['snippet']}"
        )




    return "\n\n".join(lines)


#open ai api analizeaza sursele din search_claim si da un verdict
async def verify_claim(claim:str):
    #se verifica sursele
    sources = await search_claim(claim)


    if not sources:
        return {
            "claim": claim,
            "verdict": "UNVERIFIABLE",
            "confidence": 35,
            "reasoning": "No reliable search results were found.",
            "sources": [],
        }


    prompt = f"""
        Verifică factual afirmația folosind DOAR rezultatele de căutare de mai jos.
        Nu folosi cunoștințe externe.

        Afirmație:
        {claim}

        Rezultate căutare:
        {format_sources(sources)}

        Returnează DOAR JSON valid în acest format:
        {{
        "verdict": "TRUE | FALSE | UNVERIFIABLE",
        "confidence": 0,
        "reasoning": "explicație scurtă în limba română",
        "source_indexes": [1, 2]
        }}

        IMPORTANT:
        - Câmpul "reasoning" trebuie să fie întotdeauna în limba română.
        - Nu include text în afara JSON-ului.
        """


    #trimitem datele spre analiza la open ai
    response=await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a strict fact-checking assistant. "
                    "Only use the provided search results."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ]
    )


    content = response.choices[0].message.content or "{}"
    data = parse_json(content)




    verdict = data.get("verdict", "UNVERIFIABLE")
    confidence = int(data.get("confidence", 50))
    reasoning = data.get("reasoning", "No reasoning returned.")
    source_indexes = data.get("source_indexes", [])




    if verdict not in ["TRUE", "FALSE", "UNVERIFIABLE"]:
        verdict = "UNVERIFIABLE"




    confidence = max(0, min(confidence, 100))




    used_sources = []
    if isinstance(source_indexes, list):
        for idx in source_indexes:
            if isinstance(idx, int) and 1 <= idx <= len(sources):
                used_sources.append(sources[idx - 1])




    return {
        "claim": claim,
        "verdict": verdict,
        "confidence": confidence,
        "reasoning": reasoning,
        "sources": used_sources[:3],
    }




def build_fusion(claims):
    false_count = sum(1 for c in claims if c["verdict"] == "FALSE")
    true_count = sum(1 for c in claims if c["verdict"] == "TRUE")
    unverifiable_count = sum(
        1 for c in claims if c["verdict"] == "UNVERIFIABLE"
    )




    if not claims:
        final_score = 0
    else:
        total = 0
        for claim in claims:
            if claim["verdict"] == "FALSE":
                total += min(100, 55 + claim["confidence"] * 0.45)
            elif claim["verdict"] == "UNVERIFIABLE":
                total += min(70, 20 + claim["confidence"] * 0.35)
            else:
                total += max(0, 20 - claim["confidence"] * 0.15)




        final_score = round(total / len(claims))




    if false_count >= 2:
        final_score = min(100, final_score + 10)




    if final_score >= 85:
        risk_level = "Critical"
    elif final_score >= 65:
        risk_level = "High"
    elif final_score >= 40:
        risk_level = "Medium"
    else:
        risk_level = "Low"




    if false_count >= 2 or final_score >= 65:
        verdict = "Likely Misinformation"
    elif false_count == 0 and unverifiable_count == 0:
        verdict = "Likely Credible"
    else:
        verdict = "Mixed / Needs Review"




    return {
        "final_score": final_score,
        "risk_level": risk_level,
        "verdict": verdict,
        "false_claims_count": false_count,
        "true_claims_count": true_count,
        "unverifiable_claims_count": unverifiable_count,
    }




def save_to_supabase(raw_text,location,claims,fusion):
    #salvam textul raw,scorul final dupa anlaiza,nivelul de risc,verdictul,tara si codul ei
    #nr de claimuri adevarate,false sau neverificabile
    analysis_data={
        "raw_text": raw_text,
        "final_score": fusion["final_score"],
        "risk_level": fusion["risk_level"],
        "verdict": fusion["verdict"],
        "country_code": location["country_code"],
        "country_name": location["country_name"],
        "false_claims_count": fusion["false_claims_count"],
        "true_claims_count": fusion["true_claims_count"],
        "unverifiable_claims_count": fusion["unverifiable_claims_count"],
    }


    analysis_response=(
        supabase.table("text_analyses")
        .insert(analysis_data)
        .execute()
    )


    analysis_id=analysis_response.data[0]["id"]


    claim_rows=[]
    for claim in claims:
        claim_rows.append(
            {
                "analysis_id": analysis_id,
                "claim_text": claim["claim"],
                "verdict": claim["verdict"],
                "confidence": claim["confidence"],
                "reasoning": claim["reasoning"],
                "country_code": location["country_code"],
                "country_name": location["country_name"],
                "sources": claim["sources"],
            }
        )


    if claim_rows:
        supabase.table("claims").insert(claim_rows).execute()






@app.get("/")
async def root():
    return {"mesaj": "Backendul ruleaza"}


@app.post("/fakenews/analyze")
#primim textul validat
async def analyze_text(payload: AnalyzeTextRequest, request: Request):
    try:
        location=await detect_country(request)


        claims=await extract_claims(payload.text)
        if not claims:
            raise HTTPException(
                status_code=422,
                detail="No factual claims could be extracted from this text.",
            )


        checked_claims=await asyncio.gather(
            *(verify_claim(claim) for claim in claims)
        )


        fusion=build_fusion(checked_claims)


        save_to_supabase(
            raw_text=payload.text,
            location=location,
            claims=checked_claims,
            fusion=fusion,
        )


        return {
            "text": payload.text,
            "location": location,
            "claims": checked_claims,
            "fusion": fusion,
        }


    except HTTPException:
        raise


    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}",
        ) from e

def pending_jobs():
    response = (
        supabase.table("jobs")
        .select("*")
        .eq("status", "pending")
        .execute()
    )


    jobs = response.data


    if not jobs:
        print("Nu exista job-uri pending")
        return


    for job in jobs:
        job_id = job["id"]


        (
            supabase.table("jobs")
            .update({"status": "processing"})
            .eq("id", job_id)
            .execute()
        )


        risk_score = analyze_video(job["video_url"])


        if risk_score is None:
            (
                supabase.table("jobs")
                .update({"status": "failed"})
                .eq("id", job_id)
                .execute()
            )
            continue


        explanation = interpret_score(risk_score)


        (
            supabase.table("jobs")
            .update(
                {
                    "status": "completed",
                    "risk_score": risk_score,
                    "analysis_data": {
                        "explanation": explanation,
                    },
                }
            )
            .eq("id", job_id)
            .execute()
        )




def analyze_video(video_url):
    try:
        if not DEEPFAKE_API_USER or not DEEPFAKE_API_SECRET:
            print("Lipsesc cheile Sightengine.")
            return None


        create_response = requests.get(
            "https://api.sightengine.com/1.0/upload/create-video.json",
            params={
                "api_user": DEEPFAKE_API_USER,
                "api_secret": DEEPFAKE_API_SECRET,
            },
            timeout=30,
        )
        create_response.raise_for_status()
        create_data = create_response.json()


        upload_url = create_data["upload"]["url"]
        media_id = create_data["media"]["id"]


        video_response = requests.get(video_url, timeout=120)
        video_response.raise_for_status()


        vid_bytes = video_response.content


        put_resp = requests.put(
            upload_url,
            data=vid_bytes,
            headers={
                "Content-Type": "application/octet-stream",
                "Content-Length": str(len(vid_bytes)),
            },
            timeout=300,
            verify=certifi.where(),
        )
        put_resp.raise_for_status()


        analyze_response = requests.post(
            "https://api.sightengine.com/1.0/video/check-sync.json",
            data={
                "media_id": media_id,
                "models": "genai",
                "api_user": DEEPFAKE_API_USER,
                "api_secret": DEEPFAKE_API_SECRET,
            },
            timeout=120,
        )
        analyze_response.raise_for_status()
        analyze_data = analyze_response.json()


        frames = analyze_data.get("data", {}).get("frames", [])


        if not frames:
            print("Nu exista frame-uri in raspuns.")
            return 0


        scores = [
            frame.get("type", {}).get("ai_generated", 0)
            for frame in frames
        ]


        genai_score = max(scores)
        final_score = round(genai_score * 100)


        return final_score


    except Exception as e:
        print("Eroare SightEngine GENAI:", e)
        return None


def interpret_score(score):
    if score < 30:
        return "Video-ul prezinta caracteristici naturale consistente."
    if score < 70:
        return (
            "Au fost detectate mici inconsistenta vizuale asociate "
            "continutului generat AI."
        )
    return (
        "Modelul a detectat artefacte specifice deepfake-urilor "
        "(inconsistente faciale si de randare)."
    )

@app.get("/worker")
def run_worker():
        try:
            pending_jobs()
            return {"message": "Worker executed"}
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Worker failed: {str(e)}",
            ) from e