import { useEffect, useState } from 'react'

export default function SearchFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  courseLevels = ['100', '200', '300', '400'],
  distributionAreas = []
}) {
  const [localFilters, setLocalFilters] = useState(filters)

  // Sync local filters with parent filters
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      searchText: '',
      courseLevel: '',
      distributionArea: '',
      hasPrerequisites: null
    }
    setLocalFilters(clearedFilters)
    onClearFilters()
  }

  const hasActiveFilters = 
    localFilters.searchText || 
    localFilters.courseLevel || 
    localFilters.distributionArea || 
    localFilters.hasPrerequisites !== null

  return (
    <div className="glow-card course-search-filters">
      <div className="search-filters-header">
        <h3>Search & Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="button button--secondary button--small"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="search-filters-grid">
        {/* Search Text */}
        <div className="search-filters__search">
          <label htmlFor="searchText">
            Search Courses
          </label>
          <input
            type="text"
            id="searchText"
            placeholder="Search by code, title, or description..."
            value={localFilters.searchText || ''}
            onChange={(e) => handleFilterChange('searchText', e.target.value)}
            className="search-input"
          />
        </div>

        {/* Course Level */}
        <div className="search-filters__level">
          <label htmlFor="courseLevel">
            Course Level
          </label>
          <select
            id="courseLevel"
            value={localFilters.courseLevel || ''}
            onChange={(e) => handleFilterChange('courseLevel', e.target.value)}
            className="search-select"
          >
            <option value="">All Levels</option>
            {courseLevels.map(level => (
              <option key={level} value={level}>
                {level} Level
              </option>
            ))}
          </select>
        </div>

        {/* Distribution Area */}
        {distributionAreas.length > 0 && (
          <div className="search-filters__distribution">
            <label htmlFor="distributionArea">
              Distribution Area
            </label>
            <select
              id="distributionArea"
              value={localFilters.distributionArea || ''}
              onChange={(e) => handleFilterChange('distributionArea', e.target.value)}
              className="search-select"
            >
              <option value="">All Areas</option>
              {distributionAreas.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Prerequisites */}
        <div className="search-filters__prerequisites">
          <label htmlFor="hasPrerequisites">
            Prerequisites
          </label>
          <select
            id="hasPrerequisites"
            value={localFilters.hasPrerequisites === null ? '' : localFilters.hasPrerequisites.toString()}
            onChange={(e) => {
              const value = e.target.value === '' ? null : e.target.value === 'true'
              handleFilterChange('hasPrerequisites', value)
            }}
            className="search-select"
          >
            <option value="">All Courses</option>
            <option value="false">No Prerequisites</option>
            <option value="true">Has Prerequisites</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="active-filters">
          <div className="active-filters-content">
            <span>Active filters:</span>
            {localFilters.searchText && (
              <span className="filter-tag filter-tag--search">
                Search: "{localFilters.searchText}"
              </span>
            )}
            {localFilters.courseLevel && (
              <span className="filter-tag filter-tag--level">
                Level: {localFilters.courseLevel}
              </span>
            )}
            {localFilters.distributionArea && (
              <span className="filter-tag filter-tag--area">
                Area: {localFilters.distributionArea}
              </span>
            )}
            {localFilters.hasPrerequisites !== null && (
              <span className="filter-tag filter-tag--prereq">
                Prerequisites: {localFilters.hasPrerequisites ? 'Required' : 'None'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
