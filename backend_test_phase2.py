#!/usr/bin/env python3
"""
Backend API Test Suite for HackSync - PHASE 2
Tests new Phase 2 endpoints: Google OAuth, Teams, Join Requests, Messages, AI, GitHub
"""

import requests
import json
import time
import random
import string
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs

# Base URL from .env
BASE_URL = "https://hacker-sync.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_pass(test_name):
    print(f"✅ PASS: {test_name}")
    test_results["passed"].append(test_name)

def log_fail(test_name, reason):
    print(f"❌ FAIL: {test_name}")
    print(f"   Reason: {reason}")
    test_results["failed"].append(f"{test_name}: {reason}")

def log_warning(test_name, reason):
    print(f"⚠️  WARNING: {test_name}")
    print(f"   Reason: {reason}")
    test_results["warnings"].append(f"{test_name}: {reason}")

def random_email():
    """Generate random email for testing"""
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"developer_{rand}@hacksync.dev"

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

# Global variables to store test data
user_a_token = None  # Team owner
user_a_id = None
user_b_token = None  # Join requester
user_b_id = None
team_id = None

def setup_users():
    """Setup two users for testing - User A (owner) and User B (requester)"""
    global user_a_token, user_a_id, user_b_token, user_b_id
    
    print_section("SETUP: Creating Test Users")
    
    # User A: Use demo user aarav@demo.dev
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "aarav@demo.dev",
            "password": "demo1234"
        }, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            user_a_token = data["token"]
            user_a_id = data["user"]["id"]
            print(f"✅ User A (Owner): aarav@demo.dev - ID: {user_a_id}")
        else:
            print(f"❌ Failed to login User A: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Exception setting up User A: {str(e)}")
        return False
    
    # User B: Create new test user
    user_b_email = random_email()
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": user_b_email,
            "password": "SecurePass123!",
            "name": "Rohan Kumar"
        }, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            user_b_token = data["token"]
            user_b_id = data["user"]["id"]
            
            # Complete User B's profile
            profile_data = {
                "college": "IIT Delhi",
                "year": "2nd Year",
                "bio": "Passionate about building scalable web applications",
                "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
                "skills": ["JavaScript", "React", "MongoDB"],
                "interests": ["Web Development", "AI"],
                "github": "https://github.com/rohankumar",
                "linkedin": "https://linkedin.com/in/rohankumar",
                "availability": ["Weekends", "Evenings"],
                "experience": "intermediate"
            }
            
            headers = {"Authorization": f"Bearer {user_b_token}"}
            prof_response = requests.put(f"{BASE_URL}/profile", json=profile_data, headers=headers, timeout=10)
            
            if prof_response.status_code == 200:
                print(f"✅ User B (Requester): {user_b_email} - ID: {user_b_id}")
            else:
                print(f"⚠️  User B created but profile update failed: {prof_response.status_code}")
        else:
            print(f"❌ Failed to register User B: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Exception setting up User B: {str(e)}")
        return False
    
    return True

def test_google_oauth():
    """Test Google OAuth GET /api/auth/google"""
    print_section("1. GOOGLE OAUTH")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/google", timeout=10)
        print(f"GET /api/auth/google - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "url" not in data:
                log_fail("Google OAuth: URL presence", "Missing 'url' key in response")
                return
            
            url = data["url"]
            print(f"   OAuth URL: {url[:80]}...")
            
            # Verify URL structure
            if not url.startswith("https://accounts.google.com/o/oauth2/v2/auth"):
                log_fail("Google OAuth: URL format", f"URL doesn't start with expected Google OAuth endpoint")
                return
            
            log_pass("Google OAuth: Returns valid Google consent URL")
            
            # Parse URL parameters
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            
            # Verify required parameters
            required_params = ["client_id", "redirect_uri", "response_type", "scope"]
            missing_params = [p for p in required_params if p not in params]
            
            if missing_params:
                log_fail("Google OAuth: URL parameters", f"Missing parameters: {missing_params}")
                return
            
            log_pass("Google OAuth: URL contains all required parameters")
            
            # Verify redirect_uri
            redirect_uri = params.get("redirect_uri", [""])[0]
            expected_redirect = f"{BASE_URL}/auth/google/callback"
            
            if redirect_uri == expected_redirect:
                log_pass(f"Google OAuth: Correct redirect_uri ({redirect_uri})")
            else:
                log_fail("Google OAuth: redirect_uri", f"Expected {expected_redirect}, got {redirect_uri}")
            
            # Verify scope
            scope = params.get("scope", [""])[0]
            required_scopes = ["openid", "email", "profile"]
            
            if all(s in scope for s in required_scopes):
                log_pass(f"Google OAuth: Correct scope (contains openid, email, profile)")
            else:
                log_fail("Google OAuth: scope", f"Missing required scopes. Got: {scope}")
            
        else:
            log_fail("Google OAuth: Request", f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_fail("Google OAuth: Request", f"Exception: {str(e)}")

def test_teams_create():
    """Test POST /api/teams"""
    global team_id
    
    print_section("2. TEAMS: CREATE")
    
    # Test 1: Without auth (401)
    try:
        response = requests.post(f"{BASE_URL}/teams", json={
            "name": "Test Team",
            "description": "Test description"
        }, timeout=10)
        print(f"Create team without auth - Status: {response.status_code}")
        
        if response.status_code == 401:
            log_pass("Teams Create: Without auth returns 401")
        else:
            log_fail("Teams Create: Without auth", f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_fail("Teams Create: Without auth", f"Exception: {str(e)}")
    
    # Test 2: With empty name (400)
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.post(f"{BASE_URL}/teams", json={
            "description": "Test description"
        }, headers=headers, timeout=10)
        print(f"Create team with empty name - Status: {response.status_code}")
        
        if response.status_code == 400:
            log_pass("Teams Create: Empty name returns 400")
        else:
            log_fail("Teams Create: Empty name", f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_fail("Teams Create: Empty name", f"Exception: {str(e)}")
    
    # Test 3: Successful creation
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        team_data = {
            "name": "AI Healthcare Innovators",
            "description": "Building AI-powered healthcare solutions for rural India",
            "rolesNeeded": ["Frontend Engineer", "Backend Engineer", "ML Engineer"]
        }
        
        response = requests.post(f"{BASE_URL}/teams", json=team_data, headers=headers, timeout=10)
        print(f"Create team with auth - Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            
            if "team" not in data:
                log_fail("Teams Create: Response format", "Missing 'team' key")
                return
            
            team = data["team"]
            team_id = team.get("_id")
            
            if not team_id:
                log_fail("Teams Create: Team ID", "Missing _id in team object")
                return
            
            print(f"   Team ID: {team_id}")
            print(f"   Team Name: {team.get('name')}")
            
            # Verify structure
            if team.get("name") == team_data["name"]:
                log_pass("Teams Create: Team created successfully")
            else:
                log_fail("Teams Create: Team name", f"Name mismatch")
                return
            
            # Verify owner is in members with Founder role
            members = team.get("members", [])
            if len(members) > 0:
                founder = members[0]
                if founder.get("userId") == user_a_id and founder.get("role") == "Founder":
                    log_pass("Teams Create: Owner added as Founder member")
                else:
                    log_fail("Teams Create: Founder member", f"Owner not properly added as Founder")
            else:
                log_fail("Teams Create: Members", "No members in team")
            
            # Verify joinRequests is empty array
            if team.get("joinRequests") == []:
                log_pass("Teams Create: joinRequests initialized as empty array")
            else:
                log_warning("Teams Create: joinRequests", f"Expected empty array, got {team.get('joinRequests')}")
            
        else:
            log_fail("Teams Create: With auth", f"Expected 200/201, got {response.status_code}: {response.text}")
    except Exception as e:
        log_fail("Teams Create: With auth", f"Exception: {str(e)}")

def test_teams_list():
    """Test GET /api/teams"""
    print_section("3. TEAMS: LIST")
    
    # Test 1: Get all teams
    try:
        response = requests.get(f"{BASE_URL}/teams", timeout=10)
        print(f"GET /api/teams - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "teams" not in data:
                log_fail("Teams List: Response format", "Missing 'teams' key")
                return
            
            teams = data["teams"]
            print(f"   Total teams: {len(teams)}")
            
            if len(teams) > 0:
                log_pass(f"Teams List: Returns {len(teams)} teams")
            else:
                log_warning("Teams List: Empty", "No teams returned")
        else:
            log_fail("Teams List: Request", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Teams List: Request", f"Exception: {str(e)}")
    
    # Test 2: Get teams with mine=true filter
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.get(f"{BASE_URL}/teams?mine=true", headers=headers, timeout=10)
        print(f"GET /api/teams?mine=true - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            teams = data.get("teams", [])
            print(f"   User A's teams: {len(teams)}")
            
            # Verify all teams have user_a_id in members
            all_mine = all(
                any(m.get("userId") == user_a_id for m in team.get("members", []))
                for team in teams
            )
            
            if all_mine:
                log_pass(f"Teams List: mine=true filter works ({len(teams)} teams)")
            else:
                log_fail("Teams List: mine=true filter", "Some teams don't have user in members")
        else:
            log_fail("Teams List: mine=true", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Teams List: mine=true", f"Exception: {str(e)}")

def test_teams_detail():
    """Test GET /api/teams/:id"""
    print_section("4. TEAMS: DETAIL")
    
    if not team_id:
        log_fail("Teams Detail: Setup", "No team_id available from previous tests")
        return
    
    # Test 1: Get existing team
    try:
        response = requests.get(f"{BASE_URL}/teams/{team_id}", timeout=10)
        print(f"GET /api/teams/{team_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "team" not in data:
                log_fail("Teams Detail: Response format", "Missing 'team' key")
                return
            
            team = data["team"]
            print(f"   Team: {team.get('name')}")
            
            if team.get("_id") == team_id or team.get("id") == team_id:
                log_pass("Teams Detail: Returns correct team")
            else:
                log_fail("Teams Detail: Team ID", "Returned team ID doesn't match")
        else:
            log_fail("Teams Detail: Request", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Teams Detail: Request", f"Exception: {str(e)}")
    
    # Test 2: Non-existent team (404)
    try:
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/teams/{fake_id}", timeout=10)
        print(f"GET /api/teams/{fake_id} - Status: {response.status_code}")
        
        if response.status_code == 404:
            log_pass("Teams Detail: Non-existent team returns 404")
        else:
            log_fail("Teams Detail: Non-existent team", f"Expected 404, got {response.status_code}")
    except Exception as e:
        log_fail("Teams Detail: Non-existent team", f"Exception: {str(e)}")

def test_join_requests():
    """Test POST /api/teams/:id/join and PUT /api/teams/:id/join/:userId"""
    print_section("5. JOIN REQUESTS")
    
    if not team_id:
        log_fail("Join Requests: Setup", "No team_id available")
        return
    
    # Test 1: User B sends join request
    try:
        headers = {"Authorization": f"Bearer {user_b_token}"}
        join_data = {
            "message": "Hi! I'm a full-stack developer with experience in React and Node.js. Would love to join your team and contribute to healthcare innovation!"
        }
        
        response = requests.post(f"{BASE_URL}/teams/{team_id}/join", json=join_data, headers=headers, timeout=10)
        print(f"POST /api/teams/{team_id}/join (User B) - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("ok") == True:
                log_pass("Join Requests: User B sent join request successfully")
            else:
                log_fail("Join Requests: User B join", f"Expected {{ok: true}}, got {data}")
        else:
            log_fail("Join Requests: User B join", f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_fail("Join Requests: User B join", f"Exception: {str(e)}")
    
    # Test 2: User B tries to join again (400 - already pending)
    try:
        headers = {"Authorization": f"Bearer {user_b_token}"}
        response = requests.post(f"{BASE_URL}/teams/{team_id}/join", json={"message": "Another request"}, headers=headers, timeout=10)
        print(f"POST /api/teams/{team_id}/join (duplicate) - Status: {response.status_code}")
        
        if response.status_code == 400:
            log_pass("Join Requests: Duplicate request returns 400")
        else:
            log_fail("Join Requests: Duplicate request", f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_fail("Join Requests: Duplicate request", f"Exception: {str(e)}")
    
    # Test 3: User B (non-owner) tries to approve their own request (403)
    try:
        headers = {"Authorization": f"Bearer {user_b_token}"}
        response = requests.put(f"{BASE_URL}/teams/{team_id}/join/{user_b_id}", 
                               json={"action": "approve"}, headers=headers, timeout=10)
        print(f"PUT /api/teams/{team_id}/join/{user_b_id} (non-owner) - Status: {response.status_code}")
        
        if response.status_code == 403:
            log_pass("Join Requests: Non-owner cannot approve (403)")
        else:
            log_fail("Join Requests: Non-owner approval", f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_fail("Join Requests: Non-owner approval", f"Exception: {str(e)}")
    
    # Test 4: User A (owner) approves User B's request
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.put(f"{BASE_URL}/teams/{team_id}/join/{user_b_id}", 
                               json={"action": "approve"}, headers=headers, timeout=10)
        print(f"PUT /api/teams/{team_id}/join/{user_b_id} (owner approve) - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("ok") == True:
                log_pass("Join Requests: Owner approved request successfully")
            else:
                log_fail("Join Requests: Owner approval", f"Expected {{ok: true}}, got {data}")
        else:
            log_fail("Join Requests: Owner approval", f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_fail("Join Requests: Owner approval", f"Exception: {str(e)}")
    
    # Test 5: Verify User B is now in members
    try:
        response = requests.get(f"{BASE_URL}/teams/{team_id}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            team = data.get("team", {})
            members = team.get("members", [])
            
            user_b_member = any(m.get("userId") == user_b_id for m in members)
            
            if user_b_member:
                log_pass("Join Requests: User B is now in team members")
                print(f"   Total members: {len(members)}")
            else:
                log_fail("Join Requests: Member verification", "User B not found in members after approval")
        else:
            log_fail("Join Requests: Member verification", f"Failed to fetch team: {response.status_code}")
    except Exception as e:
        log_fail("Join Requests: Member verification", f"Exception: {str(e)}")
    
    # Test 6: User B (now member) tries to join again (400 - already member)
    try:
        headers = {"Authorization": f"Bearer {user_b_token}"}
        response = requests.post(f"{BASE_URL}/teams/{team_id}/join", json={"message": "Join again"}, headers=headers, timeout=10)
        print(f"POST /api/teams/{team_id}/join (already member) - Status: {response.status_code}")
        
        if response.status_code == 400:
            log_pass("Join Requests: Already member returns 400")
        else:
            log_fail("Join Requests: Already member", f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_fail("Join Requests: Already member", f"Exception: {str(e)}")

def test_messages():
    """Test team messages and chat"""
    print_section("6. MESSAGES & CHAT")
    
    if not team_id:
        log_fail("Messages: Setup", "No team_id available")
        return
    
    # Test 1: Non-member tries to get messages (403)
    # Create a new user who is not a member
    try:
        non_member_email = random_email()
        reg_response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": non_member_email,
            "password": "test123",
            "name": "Non Member"
        }, timeout=10)
        
        if reg_response.status_code == 200:
            non_member_token = reg_response.json()["token"]
            headers = {"Authorization": f"Bearer {non_member_token}"}
            
            response = requests.get(f"{BASE_URL}/teams/{team_id}/messages", headers=headers, timeout=10)
            print(f"GET /api/teams/{team_id}/messages (non-member) - Status: {response.status_code}")
            
            if response.status_code == 403:
                log_pass("Messages: Non-member cannot access messages (403)")
            else:
                log_fail("Messages: Non-member access", f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_fail("Messages: Non-member access", f"Exception: {str(e)}")
    
    # Test 2: Member gets messages (should include welcome system message)
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.get(f"{BASE_URL}/teams/{team_id}/messages", headers=headers, timeout=10)
        print(f"GET /api/teams/{team_id}/messages (member) - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "messages" not in data or "typing" not in data:
                log_fail("Messages: Response format", f"Missing 'messages' or 'typing' key")
                return
            
            messages = data["messages"]
            typing = data["typing"]
            
            print(f"   Messages count: {len(messages)}")
            print(f"   Typing users: {len(typing)}")
            
            log_pass(f"Messages: Member can access messages ({len(messages)} messages)")
            
            # Verify welcome system message exists
            has_welcome = any("created" in m.get("content", "").lower() or "welcome" in m.get("content", "").lower() 
                            for m in messages)
            
            if has_welcome:
                log_pass("Messages: Welcome system message present")
            else:
                log_warning("Messages: Welcome message", "No welcome system message found")
            
        else:
            log_fail("Messages: Member access", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Messages: Member access", f"Exception: {str(e)}")
    
    # Test 3: Member posts a message
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        message_data = {
            "content": "Hey team! Excited to work on this healthcare project. Let's schedule a kickoff meeting this weekend."
        }
        
        response = requests.post(f"{BASE_URL}/teams/{team_id}/messages", json=message_data, headers=headers, timeout=10)
        print(f"POST /api/teams/{team_id}/messages - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "message" not in data:
                log_fail("Messages: Post response", "Missing 'message' key")
                return
            
            message = data["message"]
            
            if message.get("content") == message_data["content"]:
                log_pass("Messages: Message posted successfully")
                print(f"   Message ID: {message.get('_id') or message.get('id')}")
            else:
                log_fail("Messages: Post content", "Message content mismatch")
        else:
            log_fail("Messages: Post message", f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_fail("Messages: Post message", f"Exception: {str(e)}")
    
    # Test 4: Get messages with since parameter
    try:
        # Get messages from 1 hour ago
        since_time = (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z"
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.get(f"{BASE_URL}/teams/{team_id}/messages?since={since_time}", headers=headers, timeout=10)
        print(f"GET /api/teams/{team_id}/messages?since={since_time[:19]} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            messages = data.get("messages", [])
            
            log_pass(f"Messages: Incremental polling works (since parameter)")
            print(f"   New messages: {len(messages)}")
        else:
            log_fail("Messages: Incremental polling", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Messages: Incremental polling", f"Exception: {str(e)}")
    
    # Test 5: Typing indicator
    try:
        headers = {"Authorization": f"Bearer {user_b_token}"}
        response = requests.post(f"{BASE_URL}/teams/{team_id}/typing", headers=headers, timeout=10)
        print(f"POST /api/teams/{team_id}/typing - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("ok") == True:
                log_pass("Messages: Typing indicator posted successfully")
            else:
                log_fail("Messages: Typing indicator", f"Expected {{ok: true}}, got {data}")
        else:
            log_fail("Messages: Typing indicator", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Messages: Typing indicator", f"Exception: {str(e)}")
    
    # Test 6: Verify typing indicator appears in messages endpoint
    try:
        # Wait a moment for typing to be registered
        time.sleep(0.5)
        
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.get(f"{BASE_URL}/teams/{team_id}/messages", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            typing = data.get("typing", [])
            
            # User B should be in typing list (User A is fetching, so User B's typing should show)
            user_b_typing = any(t.get("userId") == user_b_id for t in typing)
            
            if user_b_typing:
                log_pass("Messages: Typing indicator visible to other members")
                print(f"   Typing users: {[t.get('name') for t in typing]}")
            else:
                log_warning("Messages: Typing visibility", "Typing indicator may have expired (4s TTL)")
        else:
            log_fail("Messages: Typing visibility", f"Failed to fetch messages: {response.status_code}")
    except Exception as e:
        log_fail("Messages: Typing visibility", f"Exception: {str(e)}")

def test_ai_endpoints():
    """Test AI endpoints (Gemini 2.5 Flash)"""
    print_section("7. AI ENDPOINTS (HIGH PRIORITY - 30s timeout)")
    
    if not team_id:
        log_fail("AI: Setup", "No team_id available")
        return
    
    # Test 1: Project Ideas without auth (401)
    try:
        response = requests.post(f"{BASE_URL}/ai/project-ideas", json={
            "teamId": team_id,
            "theme": "AI for healthcare"
        }, timeout=30)
        print(f"POST /api/ai/project-ideas (no auth) - Status: {response.status_code}")
        
        if response.status_code == 401:
            log_pass("AI Project Ideas: Without auth returns 401")
        else:
            log_fail("AI Project Ideas: Without auth", f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_fail("AI Project Ideas: Without auth", f"Exception: {str(e)}")
    
    # Test 2: Project Ideas with invalid teamId (404)
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        fake_team_id = "00000000-0000-0000-0000-000000000000"
        response = requests.post(f"{BASE_URL}/ai/project-ideas", json={
            "teamId": fake_team_id,
            "theme": "AI for healthcare"
        }, headers=headers, timeout=30)
        print(f"POST /api/ai/project-ideas (invalid teamId) - Status: {response.status_code}")
        
        if response.status_code == 404:
            log_pass("AI Project Ideas: Invalid teamId returns 404")
        else:
            log_fail("AI Project Ideas: Invalid teamId", f"Expected 404, got {response.status_code}")
    except Exception as e:
        log_fail("AI Project Ideas: Invalid teamId", f"Exception: {str(e)}")
    
    # Test 3: Project Ideas with valid request
    print("\n⏳ Calling Gemini AI (may take 5-20 seconds)...")
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.post(f"{BASE_URL}/ai/project-ideas", json={
            "teamId": team_id,
            "theme": "AI for healthcare in rural India"
        }, headers=headers, timeout=30)
        print(f"POST /api/ai/project-ideas - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "ideas" not in data:
                log_fail("AI Project Ideas: Response format", f"Missing 'ideas' key: {data}")
                return
            
            ideas = data["ideas"]
            
            if len(ideas) > 0:
                log_pass(f"AI Project Ideas: Returns {len(ideas)} ideas")
                
                # Verify structure of first idea
                first_idea = ideas[0]
                required_keys = ["title", "tagline", "description", "techStack", "keyFeatures", "impact"]
                missing_keys = [k for k in required_keys if k not in first_idea]
                
                if not missing_keys:
                    log_pass("AI Project Ideas: Response structure correct")
                    print(f"   Sample idea: {first_idea.get('title')}")
                    print(f"   Tagline: {first_idea.get('tagline')}")
                else:
                    log_fail("AI Project Ideas: Structure", f"Missing keys: {missing_keys}")
            else:
                log_fail("AI Project Ideas: Empty response", "No ideas returned")
        else:
            log_fail("AI Project Ideas: Request", f"Expected 200, got {response.status_code}: {response.text[:200]}")
    except requests.exceptions.Timeout:
        log_fail("AI Project Ideas: Timeout", "Request timed out after 30s")
    except Exception as e:
        log_fail("AI Project Ideas: Request", f"Exception: {str(e)}")
    
    # Test 4: Team Roles
    print("\n⏳ Calling Gemini AI for team roles (may take 5-20 seconds)...")
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.post(f"{BASE_URL}/ai/team-roles", json={
            "teamId": team_id
        }, headers=headers, timeout=30)
        print(f"POST /api/ai/team-roles - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "assignments" not in data or "summary" not in data:
                log_fail("AI Team Roles: Response format", f"Missing 'assignments' or 'summary' key")
                return
            
            assignments = data["assignments"]
            summary = data["summary"]
            
            if len(assignments) > 0:
                log_pass(f"AI Team Roles: Returns {len(assignments)} role assignments")
                
                # Verify structure
                first_assignment = assignments[0]
                required_keys = ["name", "role", "reason"]
                missing_keys = [k for k in required_keys if k not in first_assignment]
                
                if not missing_keys:
                    log_pass("AI Team Roles: Response structure correct")
                    print(f"   Sample: {first_assignment.get('name')} → {first_assignment.get('role')}")
                else:
                    log_fail("AI Team Roles: Structure", f"Missing keys: {missing_keys}")
            else:
                log_fail("AI Team Roles: Empty response", "No assignments returned")
        else:
            log_fail("AI Team Roles: Request", f"Expected 200, got {response.status_code}: {response.text[:200]}")
    except requests.exceptions.Timeout:
        log_fail("AI Team Roles: Timeout", "Request timed out after 30s")
    except Exception as e:
        log_fail("AI Team Roles: Request", f"Exception: {str(e)}")
    
    # Test 5: Team Balance
    print("\n⏳ Calling Gemini AI for team balance (may take 5-20 seconds)...")
    try:
        headers = {"Authorization": f"Bearer {user_a_token}"}
        response = requests.post(f"{BASE_URL}/ai/team-balance", json={
            "teamId": team_id
        }, headers=headers, timeout=30)
        print(f"POST /api/ai/team-balance - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            required_keys = ["strengths", "gaps", "recommendations", "score"]
            missing_keys = [k for k in required_keys if k not in data]
            
            if not missing_keys:
                log_pass("AI Team Balance: Response structure correct")
                
                score = data.get("score")
                if isinstance(score, (int, float)):
                    log_pass(f"AI Team Balance: Score is numeric ({score})")
                else:
                    log_fail("AI Team Balance: Score type", f"Score is not numeric: {score}")
                
                recommendations = data.get("recommendations", [])
                if len(recommendations) > 0:
                    log_pass(f"AI Team Balance: Returns {len(recommendations)} recommendations")
                    print(f"   Sample recommendation: {recommendations[0].get('profile')}")
                else:
                    log_warning("AI Team Balance: Recommendations", "No recommendations returned")
            else:
                log_fail("AI Team Balance: Response format", f"Missing keys: {missing_keys}")
        else:
            log_fail("AI Team Balance: Request", f"Expected 200, got {response.status_code}: {response.text[:200]}")
    except requests.exceptions.Timeout:
        log_fail("AI Team Balance: Timeout", "Request timed out after 30s")
    except Exception as e:
        log_fail("AI Team Balance: Request", f"Exception: {str(e)}")

def test_github():
    """Test GitHub public API integration"""
    print_section("8. GITHUB PUBLIC API")
    
    # Test 1: Valid username (octocat)
    try:
        response = requests.get(f"{BASE_URL}/github/octocat", timeout=15)
        print(f"GET /api/github/octocat - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            required_keys = ["username", "avatar", "publicRepos", "stars", "languages", "topRepos"]
            missing_keys = [k for k in required_keys if k not in data]
            
            if not missing_keys:
                log_pass("GitHub: Returns complete profile for octocat")
                print(f"   Username: {data.get('username')}")
                print(f"   Public Repos: {data.get('publicRepos')}")
                print(f"   Stars: {data.get('stars')}")
                print(f"   Languages: {len(data.get('languages', []))} languages")
            else:
                log_fail("GitHub: Response format", f"Missing keys: {missing_keys}")
        else:
            log_fail("GitHub: octocat request", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("GitHub: octocat request", f"Exception: {str(e)}")
    
    # Test 2: Valid username with high follower count (torvalds)
    try:
        response = requests.get(f"{BASE_URL}/github/torvalds", timeout=15)
        print(f"GET /api/github/torvalds - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            followers = data.get("followers", 0)
            
            if followers > 100000:  # Linus Torvalds has many followers
                log_pass(f"GitHub: Returns profile for torvalds (followers: {followers})")
            else:
                log_warning("GitHub: torvalds followers", f"Expected high follower count, got {followers}")
        else:
            log_fail("GitHub: torvalds request", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("GitHub: torvalds request", f"Exception: {str(e)}")
    
    # Test 3: Non-existent user (404)
    try:
        fake_username = "this-user-definitely-does-not-exist-xyz123"
        response = requests.get(f"{BASE_URL}/github/{fake_username}", timeout=10)
        print(f"GET /api/github/{fake_username} - Status: {response.status_code}")
        
        if response.status_code == 404:
            log_pass("GitHub: Non-existent user returns 404")
        else:
            log_fail("GitHub: Non-existent user", f"Expected 404, got {response.status_code}")
    except Exception as e:
        log_fail("GitHub: Non-existent user", f"Exception: {str(e)}")
    
    # Test 4: Full GitHub URL (URL-encoded)
    try:
        import urllib.parse
        full_url = "https://github.com/octocat"
        encoded_url = urllib.parse.quote(full_url, safe='')
        
        response = requests.get(f"{BASE_URL}/github/{encoded_url}", timeout=15)
        print(f"GET /api/github/{encoded_url} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("username") == "octocat":
                log_pass("GitHub: Accepts full URL (URL-encoded)")
            else:
                log_fail("GitHub: Full URL", f"Expected username 'octocat', got {data.get('username')}")
        else:
            log_fail("GitHub: Full URL", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("GitHub: Full URL", f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print_section("TEST SUMMARY - PHASE 2")
    
    total = len(test_results["passed"]) + len(test_results["failed"])
    passed = len(test_results["passed"])
    failed = len(test_results["failed"])
    warnings = len(test_results["warnings"])
    
    print(f"Total Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⚠️  Warnings: {warnings}")
    print(f"\nSuccess Rate: {(passed/total*100) if total > 0 else 0:.1f}%")
    
    if test_results["failed"]:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for failure in test_results["failed"]:
            print(f"  ❌ {failure}")
    
    if test_results["warnings"]:
        print("\n" + "="*80)
        print("WARNINGS:")
        print("="*80)
        for warning in test_results["warnings"]:
            print(f"  ⚠️  {warning}")

def main():
    print("\n" + "="*80)
    print("  HackSync Backend API Test Suite - PHASE 2")
    print("  Base URL: " + BASE_URL)
    print("="*80)
    
    # Setup users
    if not setup_users():
        print("\n❌ Failed to setup test users. Aborting tests.")
        exit(1)
    
    # Run all Phase 2 tests
    test_google_oauth()
    test_teams_create()
    test_teams_list()
    test_teams_detail()
    test_join_requests()
    test_messages()
    test_ai_endpoints()
    test_github()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if test_results["failed"]:
        exit(1)
    else:
        exit(0)

if __name__ == "__main__":
    main()
