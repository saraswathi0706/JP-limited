import json
import re
import io
import docx
from PyPDF2 import PdfReader
from typing import Dict, Any, List, Tuple
from app.core.config import settings
from app.schemas.schemas import ResumeParsed

# Conditional import for OpenAI
try:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
except Exception:
    client = None

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_docx(file_bytes: bytes) -> str:
    text = ""
    try:
        docx_file = io.BytesIO(file_bytes)
        doc = docx.Document(docx_file)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error reading DOCX: {e}")
    return text

def local_fallback_parser(text: str) -> Dict[str, Any]:
    """
    Highly refined regex & keyword parser to extract information
    when OpenAI API key is not configured.
    """
    profile = {
        "name": "Candidate Name",
        "email": "",
        "phone": "",
        "skills": [],
        "experience": [],
        "education": [],
        "projects": []
    }
    
    # Extract Email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        profile["email"] = email_match.group(0)
        
    # Extract Phone (variety of formats)
    phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    if phone_match:
        profile["phone"] = phone_match.group(0)
        
    # Extract Name (usually in first 2 lines)
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if lines:
        for line in lines[:3]:
            # Simple heuristic: line with 2-3 words, no numbers/symbols
            if len(line.split()) in [2, 3] and not re.search(r'\d|@|\+|:|http', line):
                profile["name"] = line
                break

    # Extract Skills (Common tech skills keyword matching)
    common_skills = [
        "Python", "Java", "JavaScript", "TypeScript", "React", "Angular", "Vue", "Node.js", "Express",
        "FastAPI", "Django", "Flask", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
        "AWS", "GCP", "Azure", "Git", "HTML", "CSS", "SQL", "NoSQL", "Machine Learning", "AI", "NLP",
        "C++", "C#", "Go", "Rust", "Tailwind", "Bootstrap", "Linux", "CI/CD", "Celery", "Kafka"
    ]
    
    found_skills = set()
    for skill in common_skills:
        # Match word boundaries case-insensitively
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text, re.IGNORECASE):
            found_skills.add(skill)
    profile["skills"] = list(found_skills)

    # Basic section parsing for Experience, Education, Projects
    current_section = None
    section_content = {"experience": [], "education": [], "projects": []}
    
    for line in lines:
        lower_line = line.lower()
        if any(kw in lower_line for kw in ["experience", "work history", "employment"]):
            current_section = "experience"
            continue
        elif any(kw in lower_line for kw in ["education", "academic", "university", "college"]):
            current_section = "education"
            continue
        elif any(kw in lower_line for kw in ["projects", "personal projects", "portfolio"]):
            current_section = "projects"
            continue
        
        if current_section and len(line) > 5:
            # Append lines to current section group
            section_content[current_section].append(line)
            
    # Structure parsed lists
    if section_content["experience"]:
        profile["experience"] = [{"role": "Professional Experience", "description": "\n".join(section_content["experience"][:8])}]
    if section_content["education"]:
        profile["education"] = [{"degree": "Education History", "institution": "\n".join(section_content["education"][:4])}]
    if section_content["projects"]:
        profile["projects"] = [{"name": "Key Projects", "description": "\n".join(section_content["projects"][:6])}]
        
    return profile

def parse_resume(text: str) -> Dict[str, Any]:
    """
    Parse resume text using OpenAI or local fallback
    """
    if client:
        try:
            prompt = f"""
            You are a professional resume parser. Parse the following resume text into a structured JSON format matching the schema below.
            Output ONLY valid JSON, nothing else. Do not wrap in markdown blocks like ```json ... ```.
            
            JSON schema:
            {{
                "name": "Candidate Name",
                "email": "email@example.com",
                "phone": "+1234567890",
                "skills": ["Skill1", "Skill2"],
                "experience": [
                    {{
                        "role": "Software Engineer",
                        "company": "Google",
                        "duration": "2020 - Present",
                        "description": "Built systems and APIs..."
                    }}
                ],
                "education": [
                    {{
                        "degree": "B.S. Computer Science",
                        "institution": "MIT",
                        "year": "2020"
                    }}
                ],
                "projects": [
                    {{
                        "name": "BridgeSmart App",
                        "description": "Job application automation platform."
                    }}
                ]
            }}

            Resume Text:
            {text}
            """
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful data extraction assistant that outputs structured JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            raw_response = response.choices[0].message.content.strip()
            # Remove possible markdown fences
            if raw_response.startswith("```"):
                raw_response = re.sub(r"^```json\s*|```$", "", raw_response, flags=re.MULTILINE)
            return json.loads(raw_response)
        except Exception as e:
            print(f"OpenAI Parsing failed: {e}. Falling back to local parser.")
            return local_fallback_parser(text)
    else:
        return local_fallback_parser(text)

def match_resume_job(resume_json: Dict[str, Any], job_description: str) -> Dict[str, Any]:
    """
    Calculate ATS match score (0-100), identify skill gaps, and provide improvements.
    """
    skills = resume_json.get("skills", [])
    
    if client:
        try:
            prompt = f"""
            Compare the candidate's parsed resume details and the job description.
            Evaluate them for an ATS Match Score from 0 to 100.
            Identify key missing skills or gaps, and provide actionable tips/suggestions for improvement.
            Return ONLY a JSON object with keys: "score", "gaps", "suggestions", "explanation". Do not include markdown code block wrapper.
            
            Candidate Skills: {", ".join(skills)}
            Candidate Profile JSON: {json.dumps(resume_json)}
            
            Job Description:
            {job_description}
            """
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an ATS optimization system. Output structured JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )
            raw_response = response.choices[0].message.content.strip()
            if raw_response.startswith("```"):
                raw_response = re.sub(r"^```json\s*|```$", "", raw_response, flags=re.MULTILINE)
            return json.loads(raw_response)
        except Exception as e:
            print(f"OpenAI Job Matching failed: {e}. Falling back to local algorithm.")
            
    # Local fallback matching algorithm
    # Compute similarity between job keywords and candidate skills
    job_words = set(re.findall(r'\b\w+\b', job_description.lower()))
    candidate_skills_lower = [s.lower() for s in skills]
    
    matched_skills = []
    gaps = []
    
    # We can scan common technologies that might be required
    tech_keywords = [
        "python", "java", "javascript", "typescript", "react", "angular", "vue", "node", "express",
        "fastapi", "django", "flask", "postgresql", "mysql", "mongodb", "redis", "docker", "kubernetes",
        "aws", "gcp", "azure", "git", "html", "css", "sql", "nosql", "celery", "kafka", "scrum", "agile"
    ]
    
    for word in tech_keywords:
        if word in job_words:
            if word in candidate_skills_lower:
                matched_skills.append(word.capitalize())
            else:
                gaps.append(word.capitalize())
                
    # Calculate score
    total_required = len(matched_skills) + len(gaps)
    if total_required > 0:
        score = round((len(matched_skills) / total_required) * 100, 1)
    else:
        score = 60.0  # default baseline score
        
    explanation = f"Calculated locally. Matched {len(matched_skills)} core requirements: {', '.join(matched_skills)}."
    suggestions = [f"Add {gap} to your skills and experience if you have worked with it." for gap in gaps[:4]]
    if not suggestions:
        suggestions = ["Tailor your resume objectives to highlight leadership roles."]
        
    return {
        "score": score,
        "gaps": gaps[:5],
        "suggestions": suggestions,
        "explanation": explanation
    }

def generate_cover_letter(resume_json: Dict[str, Any], job_title: str, company: str, job_description: str, tone: str = "professional") -> str:
    """
    Generate cover letter customized to user's profile and job.
    """
    name = resume_json.get("name", "Candidate")
    skills = resume_json.get("skills", [])
    
    if client:
        try:
            prompt = f"""
            Write a high-converting, personalized cover letter for the candidate:
            Name: {name}
            Skills: {', '.join(skills)}
            Applying for: {job_title} at {company}.
            Tone: {tone}
            
            Job Description:
            {job_description}
            
            Return only the body of the cover letter, starting with 'Dear Hiring Manager,' and ending with a professional sign-off.
            """
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional resume writer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI Cover Letter failed: {e}. Using fallback template.")
            
    # Local Template fallback
    skills_list = ", ".join(skills[:4]) if skills else "software development"
    letter = f"""Dear Hiring Team,

I am writing to express my strong interest in the {job_title} position at {company}. With a background in building robust systems and experience utilizing core technologies such as {skills_list}, I am confident in my ability to make a significant contribution to your engineering team.

Throughout my career, I have focused on delivering clean, scalable solutions and integrating API systems that meet business requirements. The opportunity to work at {company} excites me because your projects align closely with my technical background and professional goals.

Thank you for your time and consideration. I look forward to the possibility of discussing how my skills and experience can help {company} succeed.

Sincerely,
{name}"""
    return letter
