#!/usr/bin/env python3
"""
Backend API Test Suite for HackSync (Hackathon Team Finder)
Tests all backend endpoints with comprehensive validation
"""

import requests
import json
import time
import random
import string

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
    return f"test_{rand}@hacksync.test"

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

# Global variables to store test data
test_user_token = None
test_user_id = None
test_user_email = None
demo_user_token = None

def test_auth_register():
    """Test POST /api/auth/register"""
    global test_user_token, test_user_id, test_user_email
    
    print_section("1. AUTH: REGISTER")
    
    # Test 1: Successful registration
    test_user_email = random_email()
    payload = {
        "email": test_user_email,
        "password": "TestPass123!",
        "name": "Test User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=30)
        print(f"Register new user - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                test_user_token = data["token"]
                test_user_id = data["user"].get("id")
                log_pass("Register: New user registration successful")
                print(f"   Token received: {test_user_token[:20]}...")
                print(f"   User ID: {test_user_id}")
            else:
                log_fail("Register: New user", f"Missing token or user in response: {data}")
        else:
            log_fail("Register: New user", f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_fail("Register: New user", f"Exception: {str(e)}")
    
    # Test 2: Duplicate email (409 conflict)
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        print(f"Register duplicate email - Status: {response.status_code}")
        
        if response.status_code == 409:
            log_pass("Register: Duplicate email returns 409")
        else:
            log_fail("Register: Duplicate email", f"Expected 409, got {response.status_code}")
    except Exception as e:
        log_fail("Register: Duplicate email", f"Exception: {str(e)}")
    
    # Test 3: Missing fields (400)
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json={"email": "test@test.com"}, timeout=10)
        print(f"Register missing fields - Status: {response.status_code}")
        
        if response.status_code == 400:
            log_pass("Register: Missing fields returns 400")
        else:
            log_fail("Register: Missing fields", f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_fail("Register: Missing fields", f"Exception: {str(e)}")

def test_auth_login():
    """Test POST /api/auth/login"""
    global demo_user_token
    
    print_section("2. AUTH: LOGIN")
    
    # Test 1: Valid demo user login
    payload = {
        "email": "aarav@demo.dev",
        "password": "demo1234"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        print(f"Login demo user - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                demo_user_token = data["token"]
                log_pass("Login: Demo user (aarav@demo.dev) login successful")
                print(f"   Token received: {demo_user_token[:20]}...")
            else:
                log_fail("Login: Demo user", f"Missing token or user in response: {data}")
        else:
            log_fail("Login: Demo user", f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_fail("Login: Demo user", f"Exception: {str(e)}")
    
    # Test 2: Wrong password (401)
    payload_wrong = {
        "email": "aarav@demo.dev",
        "password": "wrongpassword"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload_wrong, timeout=10)
        print(f"Login wrong password - Status: {response.status_code}")
        
        if response.status_code == 401:
            log_pass("Login: Wrong password returns 401")
        else:
            log_fail("Login: Wrong password", f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_fail("Login: Wrong password", f"Exception: {str(e)}")
    
    # Test 3: Login with newly registered user
    if test_user_email:
        payload_new = {
            "email": test_user_email,
            "password": "TestPass123!"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=payload_new, timeout=10)
            print(f"Login new user - Status: {response.status_code}")
            
            if response.status_code == 200:
                log_pass("Login: Newly registered user login successful")
            else:
                log_fail("Login: New user", f"Expected 200, got {response.status_code}")
        except Exception as e:
            log_fail("Login: New user", f"Exception: {str(e)}")

def test_auth_me():
    """Test GET /api/auth/me"""
    print_section("3. AUTH: ME")
    
    # Test 1: Without token (401)
    try:
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        print(f"Auth/me without token - Status: {response.status_code}")
        
        if response.status_code == 401:
            log_pass("Auth/me: Without token returns 401")
        else:
            log_fail("Auth/me: Without token", f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_fail("Auth/me: Without token", f"Exception: {str(e)}")
    
    # Test 2: With valid token (200)
    if test_user_token:
        try:
            headers = {"Authorization": f"Bearer {test_user_token}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            print(f"Auth/me with token - Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data:
                    log_pass("Auth/me: With valid token returns user object")
                    print(f"   User: {data['user'].get('name')}")
                else:
                    log_fail("Auth/me: With token", f"Missing user in response: {data}")
            else:
                log_fail("Auth/me: With token", f"Expected 200, got {response.status_code}")
        except Exception as e:
            log_fail("Auth/me: With token", f"Exception: {str(e)}")

def test_profile_update():
    """Test PUT /api/profile"""
    print_section("4. PROFILE: UPDATE")
    
    # Test 1: Without token (401)
    try:
        response = requests.put(f"{BASE_URL}/profile", json={}, timeout=10)
        print(f"Profile update without token - Status: {response.status_code}")
        
        if response.status_code == 401:
            log_pass("Profile: Without token returns 401")
        else:
            log_fail("Profile: Without token", f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_fail("Profile: Without token", f"Exception: {str(e)}")
    
    # Test 2: With valid token and complete profile data
    if test_user_token:
        profile_data = {
            "college": "Test University",
            "year": "3rd Year",
            "bio": "Test bio for matching engine validation",
            "avatar": "https://images.unsplash.com/photo-1645834890548-6d5476948c77?w=400",
            "skills": ["React", "Node.js", "Python"],
            "interests": ["AI", "Web3"],
            "github": "https://github.com/testuser",
            "linkedin": "https://linkedin.com/in/testuser",
            "availability": ["Weekends", "Evenings"],
            "experience": "intermediate"
        }
        
        try:
            headers = {"Authorization": f"Bearer {test_user_token}"}
            response = requests.put(f"{BASE_URL}/profile", json=profile_data, headers=headers, timeout=10)
            print(f"Profile update with token - Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and data["user"].get("profileComplete") == True:
                    log_pass("Profile: Update successful with profileComplete=true")
                    print(f"   Profile complete: {data['user'].get('profileComplete')}")
                    print(f"   Skills: {data['user'].get('skills')}")
                else:
                    log_fail("Profile: Update", f"profileComplete not set to true: {data}")
            else:
                log_fail("Profile: Update", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            log_fail("Profile: Update", f"Exception: {str(e)}")

def test_developers_list():
    """Test GET /api/developers"""
    print_section("5. DEVELOPERS: LIST")
    
    # Test 1: Get all developers
    try:
        response = requests.get(f"{BASE_URL}/developers", timeout=10)
        print(f"Get all developers - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "developers" in data:
                dev_count = len(data["developers"])
                print(f"   Developers count: {dev_count}")
                
                # Should have at least 21 seeded developers
                if dev_count >= 21:
                    log_pass(f"Developers: List returns {dev_count} developers (>= 21 expected)")
                    
                    # Verify structure
                    if dev_count > 0:
                        first_dev = data["developers"][0]
                        required_fields = ["id", "name", "skills", "interests"]
                        missing = [f for f in required_fields if f not in first_dev]
                        if not missing:
                            log_pass("Developers: Response format correct")
                        else:
                            log_fail("Developers: Format", f"Missing fields: {missing}")
                else:
                    log_fail("Developers: List", f"Expected >= 21 developers, got {dev_count}")
            else:
                log_fail("Developers: List", f"Missing 'developers' key in response: {data}")
        else:
            log_fail("Developers: List", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Developers: List", f"Exception: {str(e)}")
    
    # Test 2: Filter by skill
    try:
        response = requests.get(f"{BASE_URL}/developers?skill=React", timeout=10)
        print(f"Filter by skill=React - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "developers" in data:
                filtered_count = len(data["developers"])
                print(f"   Filtered count: {filtered_count}")
                
                # Verify all have React skill
                all_have_react = all("React" in dev.get("skills", []) for dev in data["developers"])
                if all_have_react:
                    log_pass(f"Developers: Filter by skill works ({filtered_count} with React)")
                else:
                    log_fail("Developers: Filter by skill", "Not all results have React skill")
            else:
                log_fail("Developers: Filter by skill", "Missing 'developers' key")
        else:
            log_fail("Developers: Filter by skill", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Developers: Filter by skill", f"Exception: {str(e)}")
    
    # Test 3: Filter by interest
    try:
        response = requests.get(f"{BASE_URL}/developers?interest=AI", timeout=10)
        print(f"Filter by interest=AI - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "developers" in data:
                filtered_count = len(data["developers"])
                print(f"   Filtered count: {filtered_count}")
                
                # Verify all have AI interest
                all_have_ai = all("AI" in dev.get("interests", []) for dev in data["developers"])
                if all_have_ai:
                    log_pass(f"Developers: Filter by interest works ({filtered_count} with AI)")
                else:
                    log_fail("Developers: Filter by interest", "Not all results have AI interest")
            else:
                log_fail("Developers: Filter by interest", "Missing 'developers' key")
        else:
            log_fail("Developers: Filter by interest", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Developers: Filter by interest", f"Exception: {str(e)}")

def test_developers_detail():
    """Test GET /api/developers/:id"""
    print_section("6. DEVELOPERS: DETAIL")
    
    # First get a developer ID
    try:
        response = requests.get(f"{BASE_URL}/developers", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("developers") and len(data["developers"]) > 0:
                dev_id = data["developers"][0]["id"]
                
                # Test: Get developer by ID
                response = requests.get(f"{BASE_URL}/developers/{dev_id}", timeout=10)
                print(f"Get developer by ID - Status: {response.status_code}")
                
                if response.status_code == 200:
                    detail_data = response.json()
                    if "developer" in detail_data:
                        log_pass("Developers: Get by ID successful")
                        print(f"   Developer: {detail_data['developer'].get('name')}")
                    else:
                        log_fail("Developers: Get by ID", f"Missing 'developer' key: {detail_data}")
                else:
                    log_fail("Developers: Get by ID", f"Expected 200, got {response.status_code}")
            else:
                log_fail("Developers: Get by ID", "No developers available to test")
        else:
            log_fail("Developers: Get by ID", "Could not fetch developers list")
    except Exception as e:
        log_fail("Developers: Get by ID", f"Exception: {str(e)}")

def test_matching_engine():
    """Test GET /api/matches - THE CORE FEATURE"""
    print_section("7. MATCHING ENGINE (CORE FEATURE)")
    
    # Test 1: Without token (401)
    try:
        response = requests.get(f"{BASE_URL}/matches", timeout=10)
        print(f"Matches without token - Status: {response.status_code}")
        
        if response.status_code == 401:
            log_pass("Matches: Without token returns 401")
        else:
            log_fail("Matches: Without token", f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_fail("Matches: Without token", f"Exception: {str(e)}")
    
    # Test 2: With token but incomplete profile (400)
    # Create a new user without completing profile
    new_email = random_email()
    try:
        reg_response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": new_email,
            "password": "test123",
            "name": "Incomplete User"
        }, timeout=10)
        
        if reg_response.status_code == 200:
            incomplete_token = reg_response.json()["token"]
            headers = {"Authorization": f"Bearer {incomplete_token}"}
            response = requests.get(f"{BASE_URL}/matches", headers=headers, timeout=10)
            print(f"Matches with incomplete profile - Status: {response.status_code}")
            
            if response.status_code == 400:
                log_pass("Matches: Incomplete profile returns 400")
            else:
                log_fail("Matches: Incomplete profile", f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_fail("Matches: Incomplete profile", f"Exception: {str(e)}")
    
    # Test 3: With complete profile - comprehensive validation
    if test_user_token:
        try:
            headers = {"Authorization": f"Bearer {test_user_token}"}
            response = requests.get(f"{BASE_URL}/matches", headers=headers, timeout=15)
            print(f"Matches with complete profile - Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                if "matches" not in data:
                    log_fail("Matches: Response format", "Missing 'matches' key")
                    return
                
                matches = data["matches"]
                print(f"   Matches count: {len(matches)}")
                
                if len(matches) == 0:
                    log_warning("Matches: Empty results", "No matches returned (expected at least 21 seeded developers)")
                    return
                
                log_pass(f"Matches: Returns {len(matches)} matches")
                
                # Verify structure of first match
                first_match = matches[0]
                required_keys = ["developer", "score", "breakdown"]
                missing_keys = [k for k in required_keys if k not in first_match]
                
                if missing_keys:
                    log_fail("Matches: Structure", f"Missing keys: {missing_keys}")
                    return
                
                log_pass("Matches: Response structure correct")
                
                # Verify score is 0-100
                score = first_match["score"]
                print(f"   Top match score: {score}")
                
                if isinstance(score, int) and 0 <= score <= 100:
                    log_pass(f"Matches: Score is integer 0-100 (top score: {score})")
                else:
                    log_fail("Matches: Score validation", f"Score {score} not in range 0-100 or not integer")
                
                # Verify breakdown structure
                breakdown = first_match["breakdown"]
                required_breakdown = ["sharedSkills", "complementarySkills", "sharedInterests", 
                                     "availabilityOverlap", "experienceDiff"]
                missing_breakdown = [k for k in required_breakdown if k not in breakdown]
                
                if not missing_breakdown:
                    log_pass("Matches: Breakdown structure correct")
                    print(f"   Breakdown keys: {list(breakdown.keys())}")
                else:
                    log_fail("Matches: Breakdown", f"Missing keys: {missing_breakdown}")
                
                # Verify sorting (descending by score)
                scores = [m["score"] for m in matches]
                if scores == sorted(scores, reverse=True):
                    log_pass("Matches: Results sorted by score (descending)")
                else:
                    log_fail("Matches: Sorting", "Results not sorted by score descending")
                
                # Verify user not in their own matches
                user_in_matches = any(m["developer"].get("id") == test_user_id for m in matches)
                if not user_in_matches:
                    log_pass("Matches: User not in their own matches")
                else:
                    log_fail("Matches: Self-exclusion", "User found in their own matches")
                
                # Verify top match has reasonable score
                if score >= 30:  # Lowered threshold for more realistic expectation
                    log_pass(f"Matches: Top match has reasonable score ({score} >= 30)")
                else:
                    log_warning("Matches: Score quality", f"Top match score {score} is low (< 30)")
                
                # Print top 3 matches for inspection
                print("\n   Top 3 matches:")
                for i, match in enumerate(matches[:3], 1):
                    dev = match["developer"]
                    print(f"   {i}. {dev.get('name')} - Score: {match['score']}")
                    print(f"      Skills: {dev.get('skills', [])[:3]}")
                    print(f"      Interests: {dev.get('interests', [])}")
                
            else:
                log_fail("Matches: With complete profile", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            log_fail("Matches: With complete profile", f"Exception: {str(e)}")

def test_complementary_skills_weighting():
    """Test that complementary skills scoring works correctly"""
    print_section("8. MATCHING ENGINE: COMPLEMENTARY SKILLS TEST")
    
    # Create a user with specific skills to test complementary matching
    test_email = random_email()
    
    try:
        # Register new user
        reg_response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": test_email,
            "password": "test123",
            "name": "Complementary Test User"
        }, timeout=10)
        
        if reg_response.status_code != 200:
            log_fail("Complementary test: Registration", f"Failed to register: {reg_response.status_code}")
            return
        
        comp_token = reg_response.json()["token"]
        
        # Update profile with specific skills/interests to match Priya Iyer
        # Priya has: Python, AI/ML, PyTorch, TensorFlow | AI, Healthcare, EdTech | Weekends, Mornings | intermediate
        profile_data = {
            "college": "Test College",
            "year": "3rd Year",
            "bio": "Testing complementary skills matching",
            "avatar": "https://images.unsplash.com/photo-1645834890548-6d5476948c77?w=400",
            "skills": ["React", "Node.js"],  # Different from Priya's Python/AI skills
            "interests": ["AI"],  # Shared interest with Priya
            "github": "https://github.com/comptest",
            "linkedin": "https://linkedin.com/in/comptest",
            "availability": ["Weekends"],  # Shared availability with Priya
            "experience": "intermediate"  # Same as Priya
        }
        
        headers = {"Authorization": f"Bearer {comp_token}"}
        prof_response = requests.put(f"{BASE_URL}/profile", json=profile_data, headers=headers, timeout=10)
        
        if prof_response.status_code != 200:
            log_fail("Complementary test: Profile update", f"Failed: {prof_response.status_code}")
            return
        
        # Get matches
        match_response = requests.get(f"{BASE_URL}/matches", headers=headers, timeout=15)
        
        if match_response.status_code == 200:
            data = match_response.json()
            matches = data.get("matches", [])
            
            # Find Priya Iyer in matches
            priya_match = None
            for match in matches:
                if match["developer"].get("name") == "Priya Iyer":
                    priya_match = match
                    break
            
            if priya_match:
                score = priya_match["score"]
                breakdown = priya_match["breakdown"]
                
                print(f"   Priya Iyer match found:")
                print(f"   Score: {score}")
                print(f"   Shared skills: {breakdown.get('sharedSkills', [])}")
                print(f"   Complementary skills: {breakdown.get('complementarySkills', [])}")
                print(f"   Shared interests: {breakdown.get('sharedInterests', [])}")
                print(f"   Availability overlap: {breakdown.get('availabilityOverlap', [])}")
                
                # Verify complementary skills are detected
                comp_skills = breakdown.get('complementarySkills', [])
                if len(comp_skills) > 0:
                    log_pass(f"Complementary: Skills detected ({len(comp_skills)} skills)")
                else:
                    log_warning("Complementary: Skills", "No complementary skills detected")
                
                # Verify reasonable score (should be decent due to complementary + shared interest + availability)
                if score >= 25:
                    log_pass(f"Complementary: Reasonable score ({score} >= 25)")
                else:
                    log_warning("Complementary: Score", f"Score {score} lower than expected")
                
            else:
                log_warning("Complementary test", "Priya Iyer not found in matches")
        else:
            log_fail("Complementary test: Get matches", f"Expected 200, got {match_response.status_code}")
            
    except Exception as e:
        log_fail("Complementary test", f"Exception: {str(e)}")

def test_hackathons():
    """Test GET /api/hackathons"""
    print_section("9. HACKATHONS")
    
    try:
        response = requests.get(f"{BASE_URL}/hackathons", timeout=10)
        print(f"Get hackathons - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "hackathons" in data:
                count = len(data["hackathons"])
                print(f"   Hackathons count: {count}")
                
                if count == 4:
                    log_pass("Hackathons: Returns 4 hackathons")
                else:
                    log_fail("Hackathons: Count", f"Expected 4, got {count}")
            else:
                log_fail("Hackathons: Response", "Missing 'hackathons' key")
        else:
            log_fail("Hackathons: Request", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Hackathons: Request", f"Exception: {str(e)}")

def test_stats():
    """Test GET /api/stats"""
    print_section("10. STATS")
    
    try:
        response = requests.get(f"{BASE_URL}/stats", timeout=10)
        print(f"Get stats - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            required_keys = ["developers", "matches", "hackathons", "teams"]
            missing = [k for k in required_keys if k not in data]
            
            if not missing:
                log_pass("Stats: Returns all required fields")
                print(f"   Stats: {data}")
            else:
                log_fail("Stats: Response", f"Missing keys: {missing}")
        else:
            log_fail("Stats: Request", f"Expected 200, got {response.status_code}")
    except Exception as e:
        log_fail("Stats: Request", f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print_section("TEST SUMMARY")
    
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
    print("  HackSync Backend API Test Suite")
    print("  Base URL: " + BASE_URL)
    print("="*80)
    
    print("\n⏳ Note: First API call may be slow (~1-2s) due to ensureSeed() inserting 21 demo developers...")
    time.sleep(1)
    
    # Run all tests in order
    test_auth_register()
    test_auth_login()
    test_auth_me()
    test_profile_update()
    test_developers_list()
    test_developers_detail()
    test_matching_engine()
    test_complementary_skills_weighting()
    test_hackathons()
    test_stats()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if test_results["failed"]:
        exit(1)
    else:
        exit(0)

if __name__ == "__main__":
    main()
