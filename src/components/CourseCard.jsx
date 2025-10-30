import { useState } from 'react'

export default function CourseCard({ course }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getLevelBadgeColor = (level) => {
    switch (level) {
      case '100': return 'bg-blue-100 text-blue-800'
      case '200': return 'bg-green-100 text-green-800'
      case '300': return 'bg-yellow-100 text-yellow-800'
      case '400': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="glow-card course-card">
      <div className="course-card__header">
        <div className="course-card__header-content">
          <div className="course-card__title-row">
            <h3 className="course-card__code">
              {course.courseCode}
            </h3>
            <span className={`course-level-badge ${getLevelBadgeColor(course.courseLevel)}`}>
              {course.courseLevel} Level
            </span>
          </div>
          <h4 className="course-card__title">
            {course.title}
          </h4>
          <div className="course-card__meta">
            <span className="course-card__credits">
              <svg className="course-card__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {course.credits}
            </span>
            <span className="course-card__distribution">
              <svg className="course-card__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {course.distributionArea}
            </span>
          </div>
        </div>
      </div>

      <div className="course-card__content">
        <div className="course-card__description">
          <p>
            {isExpanded ? course.description : `${course.description.substring(0, 150)}...`}
          </p>
          {course.description && course.description.length > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="course-card__expand-button"
            >
              {isExpanded ? 'Show Less' : 'Read More'}
            </button>
          )}
        </div>

        {course.prerequisites && course.prerequisites.length > 0 && (
          <div className="course-card__prerequisites">
            <h5>Prerequisites:</h5>
            <div className="course-card__prereq-tags">
              {course.prerequisites.map((prereq, index) => (
                <span
                  key={index}
                  className="prereq-tag"
                >
                  {prereq}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
