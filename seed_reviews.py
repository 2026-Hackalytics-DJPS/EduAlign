"""Seed realistic demo reviews for the hackathon."""
import random
from backend.database import SessionLocal, init_db
from backend.models import Review, User, REVIEW_TAGS

SEED_DATA = [
    (104151, [
        {"overall": 4, "pros": "Arizona State has an incredible innovation ecosystem. The research opportunities are endless, and the Tempe campus is vibrant with things to do. Professors are approachable.", "cons": "Class sizes can be enormous, especially for lower-level courses. It's hard to get individual attention. The Arizona heat is also brutal from August to October.", "advice": "Take advantage of Barrett Honors if you can. It gives you the small-college feel within a big university. Also, go to office hours — that's how you stand out.", "attendance": "alumni", "year": "Senior", "major": "Computer Science", "recommend": "yes", "tags": ["Research Focused", "Big School Energy", "Career Focused"]},
        {"overall": 3, "pros": "The social scene is great and there's always something happening on campus. Greek life is huge but not the only option. The gym facilities are top-notch.", "cons": "Advising is terrible. I was given wrong information about graduation requirements twice and had to take an extra semester. The bureaucracy is frustrating for a school this size.", "advice": "Double-check everything your advisor tells you. Use the degree audit tool yourself. Don't wait until senior year to verify your credit count.", "attendance": "current", "year": "Junior", "major": "Business Administration", "recommend": "maybe", "tags": ["Party School", "Greek Life", "Sports Culture"]},
    ]),
    (228723, [
        {"overall": 5, "pros": "The Aggie network is unmatched. Everywhere I've gone in my career, there's been an Aggie willing to help. The traditions make you feel part of something bigger than yourself.", "cons": "College Station is isolated. If you don't have a car, you're stuck on campus. There's not a lot of diversity in thought or background compared to schools in major cities.", "advice": "Go to Midnight Yell at least once. Get involved in a Fish Camp. The traditions seem weird at first but they become the most meaningful part of your experience.", "attendance": "alumni", "year": "Senior", "major": "Engineering", "recommend": "yes", "tags": ["Strong Alumni Network", "Sports Culture", "Collaborative"]},
        {"overall": 4, "pros": "Engineering program is world-class. The Career Fair brings hundreds of companies to campus. Most of my friends had jobs lined up by October of senior year.", "cons": "The honors program has a lot of unnecessary busy work. Some professors are clearly there only for research and don't care about teaching undergrads.", "advice": "Start networking at career fairs from freshman year. Companies remember faces they've seen multiple times. Also, take ENGR 102 seriously — it sets the tone.", "attendance": "current", "year": "Senior", "major": "Mechanical Engineering", "recommend": "yes", "tags": ["Career Focused", "Research Focused", "Strong Alumni Network"]},
    ]),
    (132903, [
        {"overall": 4, "pros": "UCF's hospitality and game design programs are among the best in the country. Orlando location means internship opportunities with Disney, Universal, and Lockheed Martin.", "cons": "Campus feels like a commuter school. A lot of students leave on weekends which kills the social atmosphere. Parking is a nightmare — I spent 30 minutes looking for a spot daily.", "advice": "Live on campus at least freshman year. It's the only way to build a friend group early. Also, the campus shuttles are way better than trying to park.", "attendance": "alumni", "year": "Graduate", "major": "Hospitality Management", "recommend": "yes", "tags": ["Career Focused", "Big School Energy", "Good Financial Aid"]},
    ]),
    (204796, [
        {"overall": 5, "pros": "Ohio State is the full college experience. Football Saturdays in the Horseshoe are unforgettable. The Fisher College of Business opened doors I never imagined. Columbus is an amazing city for students.", "cons": "The campus is so large that walking between classes can take 20+ minutes. Winter is brutal — bring a good coat. Some gen-ed classes have 500+ students.", "advice": "Get a CABS map and learn the bus routes. It will save you in winter. Also, join clubs early — that's where you'll find your people in a school of 60,000.", "attendance": "alumni", "year": "Senior", "major": "Finance", "recommend": "yes", "tags": ["Sports Culture", "Big School Energy", "Career Focused", "Good Food"]},
        {"overall": 4, "pros": "The research opportunities here are incredible even for undergrads. I was working in a lab by sophomore year. The medical center is world-class and creates tons of opportunities.", "cons": "Housing lottery is stressful. Off-campus housing near campus is overpriced. The academic advising varies wildly by department — some are great, others are useless.", "advice": "Apply for undergraduate research as soon as possible. Also, live on South campus freshman year if you're in STEM — it's closer to most science buildings.", "attendance": "current", "year": "Junior", "major": "Biology", "recommend": "yes", "tags": ["Research Focused", "Beautiful Campus", "Diverse"]},
    ]),
    (228778, [
        {"overall": 5, "pros": "UT Austin is a world-class university in one of the best cities in America. Austin's tech scene means constant networking events and internship pipelines. The campus is gorgeous.", "cons": "Getting into your major is competitive even after admission. I know people who couldn't get into McCombs despite great GPAs. Cost of living in Austin keeps rising.", "advice": "Apply to your desired major early and have a backup plan. Austin is amazing but expensive — budget carefully. Also, explore the food trucks on Guadalupe.", "attendance": "current", "year": "Senior", "major": "Computer Science", "recommend": "yes", "tags": ["Career Focused", "Beautiful Campus", "Diverse", "Good Food"]},
    ]),
    (214777, [
        {"overall": 4, "pros": "Penn State has one of the strongest alumni networks in the country. Happy Valley is a unique experience that's hard to replicate. The White Out game is something every student should experience.", "cons": "State College is in the middle of nowhere. If you want city access, you're looking at 3+ hours to Philadelphia or Pittsburgh. Winter is long and cold.", "advice": "Don't underestimate the value of Penn State's career fairs. Companies recruit heavily here. Also, take ECON 104 with anyone but the 8am section.", "attendance": "alumni", "year": "Senior", "major": "Supply Chain Management", "recommend": "yes", "tags": ["Strong Alumni Network", "Sports Culture", "Collaborative", "Big School Energy"]},
    ]),
    (186380, [
        {"overall": 4, "pros": "Rutgers gives you a great education at a reasonable price, especially for NJ residents. The New Brunswick campus is diverse and close to NYC. Tons of research opportunities.", "cons": "The bus system between campuses is a constant frustration. Getting from Cook to College Ave during rush takes forever. Some buildings are outdated and need renovation.", "advice": "Plan your schedule around campus locations, not just times. Living on the same campus as most of your classes will save your sanity. Also, the grease trucks are a must-try.", "attendance": "current", "year": "Sophomore", "major": "Computer Science", "recommend": "yes", "tags": ["Diverse", "Affordable", "Good Financial Aid", "Research Focused"]},
        {"overall": 3, "pros": "The pharmacy and engineering programs are genuinely excellent. Being close to NYC and Philly gives you access to incredible internship opportunities.", "cons": "The administration is disorganized. Simple tasks like transferring credits or changing majors take weeks of back-and-forth emails. Student services feel understaffed.", "advice": "Be your own advocate. Don't wait for the university to help you — go to offices in person, follow up on emails, and keep records of everything.", "attendance": "alumni", "year": "Graduate", "major": "Pharmacy", "recommend": "maybe", "tags": ["Research Focused", "Diverse", "Career Focused"]},
    ]),
    (240444, [
        {"overall": 5, "pros": "UW-Madison is the perfect blend of academics and social life. The terrace on Lake Mendota is magical. Research output rivals Ivy League schools at a fraction of the cost.", "cons": "Madison winters are no joke — temperatures regularly hit -20°F. If you're not from the Midwest, the cold will be a culture shock. Also, finding housing near campus is competitive.", "advice": "Apply for housing early and consider co-ops. Get a good winter coat before September. Also, take a class at the Chazen Museum — it's a hidden gem.", "attendance": "current", "year": "Junior", "major": "Data Science", "recommend": "yes", "tags": ["Research Focused", "Beautiful Campus", "Good Food", "Social Life"]},
    ]),
    (145637, [
        {"overall": 4, "pros": "UIUC's engineering and CS programs are world-renowned for good reason. The career pipelines to Silicon Valley and Chicago tech are strong. Champaign has everything a college town needs.", "cons": "If you're not in STEM, you can feel like a second-class citizen here. Resources are clearly concentrated in engineering and CS. The campus is flat and feels monotonous.", "advice": "Use the career center aggressively from freshman year. The Engineering Career Fair is one of the largest in the country. Also, Green Street has the best late-night food.", "attendance": "alumni", "year": "Senior", "major": "Computer Engineering", "recommend": "yes", "tags": ["Career Focused", "Research Focused", "Collaborative", "Hard Coursework"]},
        {"overall": 3, "pros": "The campus is massive with great facilities. Libraries are well-stocked and open late. The campus culture around basketball and football is fun during season.", "cons": "Mental health resources are overwhelmed. Getting a counseling appointment takes weeks. The pressure in STEM programs can be intense and support systems feel inadequate.", "advice": "Build a support system early. Find study groups, use the Writing Center, and don't be afraid to go to office hours. Your TAs are often more helpful than professors.", "attendance": "current", "year": "Sophomore", "major": "Mathematics", "recommend": "maybe", "tags": ["Hard Coursework", "Research Focused", "Big School Energy"]},
    ]),
    (171100, [
        {"overall": 4, "pros": "MSU has a beautiful campus and one of the best college towns in America. The Broad College of Business is solid. The alumni network is strong, especially in the Midwest.", "cons": "The campus is enormous — biking or taking the bus is basically required. Some academic buildings are outdated. The STEM advising department is hit or miss.", "advice": "Get a bike on day one. It will change your college experience. Also, take advantage of study abroad — MSU has one of the largest programs in the country.", "attendance": "alumni", "year": "Senior", "major": "Marketing", "recommend": "yes", "tags": ["Beautiful Campus", "Sports Culture", "Strong Alumni Network", "Good Food"]},
    ]),
    (243780, [
        {"overall": 4, "pros": "Purdue engineering is elite. The co-op program gives you real industry experience before graduation. West Lafayette is affordable and the campus has great facilities.", "cons": "The social scene is limited compared to bigger college towns. If you're not into engineering or STEM culture, it can feel isolating. Gender ratio in engineering is still very skewed.", "advice": "Do a co-op or internship through Purdue's program. Companies trust Purdue grads and the placement rates show it. Also, breakfast at Triple X Diner is a tradition.", "attendance": "current", "year": "Senior", "major": "Aerospace Engineering", "recommend": "yes", "tags": ["Career Focused", "Hard Coursework", "Collaborative", "Research Focused"]},
    ]),
    (151351, [
        {"overall": 4, "pros": "IU Bloomington is a quintessential Big Ten experience. The Kelley School of Business is a top-20 program. Bloomington is a charming college town with great restaurants and culture.", "cons": "Greek life dominates the social scene which isn't for everyone. If you're not in Kelley or Jacobs, the prestige factor drops significantly. The party reputation can be distracting.", "advice": "Apply to Kelley direct admit if business interests you at all. Getting in as a freshman is much easier than transferring in. Also, explore the trails around the campus — they're stunning.", "attendance": "alumni", "year": "Senior", "major": "Finance", "recommend": "yes", "tags": ["Greek Life", "Beautiful Campus", "Career Focused", "Good Food"]},
    ]),
    (137351, [
        {"overall": 3, "pros": "USF is affordable and Tampa is a great city with tons of internship opportunities. The health sciences programs are strong. Campus has been renovated significantly in recent years.", "cons": "Commuter school vibe is real. After Friday, the campus empties out. Building a social life takes more effort compared to traditional residential campuses.", "advice": "Join clubs and organizations immediately. That's how you'll meet people. Also, the USF Health Morsani College is amazing if you're pre-med — start building relationships with professors early.", "attendance": "current", "year": "Junior", "major": "Public Health", "recommend": "yes", "tags": ["Affordable", "Career Focused", "Good Financial Aid"]},
    ]),
]

random.seed(42)

def seed():
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(Review).count()
        if existing > 0:
            print(f"Already have {existing} reviews. Skipping seed.")
            return

        reviewer = db.query(User).first()
        if not reviewer:
            print("No users in DB. Create a user first.")
            return

        uid = reviewer.id
        count = 0

        for unitid, reviews in SEED_DATA:
            for r in reviews:
                dims = {}
                for dim in ["academic_intensity", "social_life", "inclusivity", "career_support",
                           "collaboration_vs_competition", "mental_health_culture", "campus_safety",
                           "overall_satisfaction"]:
                    base = r["overall"] * 2
                    dims[dim] = max(1, min(10, base + random.randint(-2, 2)))

                review = Review(
                    user_id=uid,
                    unitid=unitid,
                    overall_rating=r["overall"],
                    dimension_ratings=dims,
                    pros=r["pros"],
                    cons=r["cons"],
                    advice=r.get("advice"),
                    would_recommend=r["recommend"],
                    attendance_status=r["attendance"],
                    year=r.get("year"),
                    major=r.get("major"),
                    tags=r.get("tags", []),
                    upvotes=random.randint(0, 15),
                    downvotes=random.randint(0, 3),
                )
                db.add(review)
                count += 1

        db.commit()
        print(f"Seeded {count} reviews across {len(SEED_DATA)} colleges.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
