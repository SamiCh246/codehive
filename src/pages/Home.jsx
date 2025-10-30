import { useEffect, useState } from 'react'
import { FaBookOpen, FaCalendarCheck, FaUserGraduate, FaUsers } from 'react-icons/fa'
import { Link } from 'react-router-dom'

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <section className="home">
      <div className={`home__hero ${isLoaded ? 'home__hero--loaded' : ''}`}>
        <span className="home__badge">MVP Beta</span>
        <h1 className="home__headline">
          Unifying <span className="home__gradient-text">Computer Science</span> Resources for Every DePauw Student.
        </h1>
        <p className="home__deck">
          CodeHive makes it simple to manage your academic profile, book TA sessions, and explore career roadmaps all in one secure, student-friendly platform.
        </p>

        <div className="home__cta">
          <Link className="button button--cta" to="/profiles">
            Get Started
          </Link>
        </div>
      </div>

      <div className="home__grid">
        <article className="glow-card home__card">
          <FaUserGraduate className="home__card-icon" aria-hidden="true" />
          <h2>Student Profiles</h2>
          <p>
            Curate verified highlights of your coursework, clubs, and interests. Set audience
            visibility per field and link to GitHub, LinkedIn, and your portfolio with confidence.
          </p>
        </article>
        <article className="glow-card home__card">
          <FaCalendarCheck className="home__card-icon" aria-hidden="true" />
          <h2>TA Calendar Booking</h2>
          <p>
            Browse live availability, reserve focused sessions, and receive synced notifications.
            Smart guardrails prevent double booking and honor grace periods for changes.
          </p>
        </article>
        <article className="glow-card home__card">
          <FaBookOpen className="home__card-icon" aria-hidden="true" />
          <h2>Course Catalog</h2>
          <p>
            Explore active CS courses, view schedules, and discover offerings across semesters in one place.
            Filter by professor or interest area to quickly find what fits your plan.
          </p>
        </article>
        <article className="glow-card home__card">
          <FaUsers className="home__card-icon" aria-hidden="true" />
          <h2>Social</h2>
          <p>
            Connect with peers, start chats from profiles, and collaborate with classmates securely.
            Share opportunities, ask questions, and keep conversations organized around your courses
            and interests.
          </p>
        </article>
      </div>
    </section>
  )
}
