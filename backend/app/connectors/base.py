from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class PortalConnector(ABC):
    """
    Abstract Base Class for all Job Portal Connectors.
    Each job portal adapter must implement these interfaces.
    """
    
    @abstractmethod
    def get_portal_name(self) -> str:
        """Returns the name of the job portal."""
        pass
        
    @abstractmethod
    def search_jobs(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search jobs on the portal.
        Query dictionary contains keys like: keywords, location, remote, experience, etc.
        """
        pass
        
    @abstractmethod
    def fetch_job_details(self, job_url_or_id: str) -> Dict[str, Any]:
        """Fetch detailed information of a job including description, requirements, etc."""
        pass
        
    @abstractmethod
    def apply_job(self, job_details: Dict[str, Any], resume_data: Dict[str, Any], cover_letter: Optional[str] = None) -> Dict[str, Any]:
        """
        Submit a candidate application.
        Returns application status details (status, application_id, external_ref).
        """
        pass

    @abstractmethod
    def sign_up_candidate(self, email: str, profile_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Register a new candidate profile automatically on the portal.
        Returns registration status details (success, candidate_id, message).
        """
        pass
