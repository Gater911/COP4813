"use strict";

document.addEventListener('DOMContentLoaded', function ()
{
    const dataFile = '../JSON/bsit_courses.json';

    const foundationContainer = document.getElementById('foundation-groups');
    const programContainer = document.getElementById('program-courses');
    const availableContainer = document.getElementById('available-courses');
    const detailsContainer = document.getElementById('course-details');
    const dataStatus = document.getElementById('data-status');
    const planMessage = document.getElementById('plan-message');
    const planGrid = document.getElementById('plan-grid');
    const activePlanBanner = document.getElementById('active-plan-banner');

    const planTermSelect = document.getElementById('plan-term-select');
    const planYearInput = document.getElementById('plan-year');
    const addSemesterButton = document.getElementById('add-semester-button');
    const exampleButton = document.getElementById('example-button');
    const resetButton = document.getElementById('reset-button');

    const completedCreditsOutput = document.getElementById('completed-credits');
    const availableCountOutput = document.getElementById('available-count');
    const plannedCreditsOutput = document.getElementById('planned-credits');
    const electiveStatusOutput = document.getElementById('elective-status');

    let advisorData = null;
    let courseMap = new Map();
    let activeDrag = null;

    const state =
    {
        completed: new Set(),
        planTerms: [],
        activePlanId: null
    };

    const semesterOrder =
    {
        Spring: 1,
        Summer: 2,
        Fall: 3
    };

    function makePlanId(term, year)
    {
        return term.toLowerCase() + '-' + year;
    }

    function planLabel(planTerm)
    {
        return planTerm.term + ' ' + planTerm.year;
    }

    function periodValue(planTerm)
    {
        return (Number(planTerm.year) * 10) + semesterOrder[planTerm.term];
    }

    function sortPlanTerms()
    {
        state.planTerms.sort(function (a, b)
        {
            return periodValue(a) - periodValue(b);
        });
    }

    function getPlanTerm(planId)
    {
        return state.planTerms.find(function (planTerm)
        {
            return planTerm.id === planId;
        }) || null;
    }

    function getActivePlanTerm()
    {
        return getPlanTerm(state.activePlanId);
    }

    function saveState()
    {

    }

    function loadState()
    {
        // Start with a completely blank advisor every time the page loads.
        state.completed.clear();
        state.planTerms = [];
        state.activePlanId = null;
    }

    function satisfiedCoursesBefore(planTerm)
    {
        const satisfied = new Set(state.completed);

        if (!planTerm)
        {
            return satisfied;
        }

        state.planTerms.forEach(function (candidate)
        {
            if (periodValue(candidate) < periodValue(planTerm))
            {
                candidate.courses.forEach(function (courseId)
                {
                    satisfied.add(courseId);
                });
            }
        });

        return satisfied;
    }

    function satisfiedCoursesForPlanningList()
    {
        const satisfied = new Set(state.completed);

        state.planTerms.forEach(function (planTerm)
        {
            planTerm.courses.forEach(function (courseId)
            {
                satisfied.add(courseId);
            });
        });

        return satisfied;
    }

    function prerequisiteReadyForPlanningList(course)
    {
        return evaluateRequirement(
            course.prerequisites,
            satisfiedCoursesForPlanningList()
        );
    }

    function collectRequirementCourseIds(requirement, courseIds)
    {
        if (!requirement)
        {
            return;
        }

        if (typeof requirement === 'string')
        {
            courseIds.add(requirement);
            return;
        }

        if (Array.isArray(requirement))
        {
            requirement.forEach(function (item)
            {
                collectRequirementCourseIds(item, courseIds);
            });
            return;
        }

        if (Array.isArray(requirement.all))
        {
            requirement.all.forEach(function (item)
            {
                collectRequirementCourseIds(item, courseIds);
            });
        }

        if (Array.isArray(requirement.any))
        {
            requirement.any.forEach(function (item)
            {
                collectRequirementCourseIds(item, courseIds);
            });
        }
    }

    let dragPreview = null;

    function positionDragPreview(clientX, clientY)
    {
        if (!dragPreview || !clientX || !clientY)
        {
            return;
        }

        const offset = 18;
        const previewWidth = dragPreview.offsetWidth || 260;
        const previewHeight = dragPreview.offsetHeight || 90;

        let left = clientX + offset;
        let top = clientY + offset;

        if (left + previewWidth > window.innerWidth - 10)
        {
            left = clientX - previewWidth - offset;
        }

        if (top + previewHeight > window.innerHeight - 10)
        {
            top = clientY - previewHeight - offset;
        }

        dragPreview.style.left = Math.max(10, left) + 'px';
        dragPreview.style.top = Math.max(10, top) + 'px';
    }

    function createDragPreview(sourceElement, course, clientX, clientY)
    {
        removeDragPreview();

        const preview = document.createElement('div');
        preview.className = 'drag-preview';

        const label = document.createElement('div');
        label.className = 'drag-preview-label';
        label.textContent = 'Moving ' + course.id;

        const title = document.createElement('strong');
        title.textContent = course.id + ' - ' + course.title;

        const details = document.createElement('div');
        details.textContent =
            course.credits + ' credits • Offered: ' +
            offeredSemesterNames(course);

        preview.appendChild(label);
        preview.appendChild(title);
        preview.appendChild(details);

        const sourceWidth = sourceElement.getBoundingClientRect().width;
        preview.style.width =
            Math.min(Math.max(sourceWidth, 240), 360) + 'px';

        document.body.appendChild(preview);
        dragPreview = preview;

        positionDragPreview(clientX, clientY);
    }

    function removeDragPreview()
    {
        if (dragPreview)
        {
            dragPreview.remove();
            dragPreview = null;
        }
    }

    function beginCourseDrag(event, sourceElement, course, sourcePlanId)
    {
        activeDrag =
        {
            courseId: course.id,
            sourcePlanId: sourcePlanId || null
        };

        event.dataTransfer.setData('text/plain', course.id);
        event.dataTransfer.effectAllowed = 'move';

        sourceElement.classList.add('dragging');
        document.body.classList.add('course-drag-active');

        createDragPreview(
            sourceElement,
            course,
            event.clientX,
            event.clientY
        );

        const transparentDragImage = document.createElement('canvas');
        transparentDragImage.width = 1;
        transparentDragImage.height = 1;
        event.dataTransfer.setDragImage(transparentDragImage, 0, 0);

        highlightDragSemesters(course);
    }

    function endCourseDrag(sourceElement)
    {
        sourceElement.classList.remove('dragging');
        document.body.classList.remove('course-drag-active');
        clearDragHighlights();
        removeDragPreview();

        window.setTimeout(function ()
        {
            activeDrag = null;
        }, 0);
    }

    document.addEventListener('dragover', function (event)
    {
        if (!activeDrag)
        {
            return;
        }

        positionDragPreview(event.clientX, event.clientY);
    });

    document.addEventListener('drag', function (event)
    {
        if (!activeDrag)
        {
            return;
        }

        if (event.clientX || event.clientY)
        {
            positionDragPreview(event.clientX, event.clientY);
        }
    });

    function clearDragHighlights()
    {
        document.querySelectorAll('.plan-column.invalid-destination-highlight').forEach(function (column)
        {
            column.classList.remove('invalid-destination-highlight');
        });
    }

    function prerequisiteBoundaryValue(course)
    {
        const prerequisiteIds = new Set();
        collectRequirementCourseIds(course.prerequisites, prerequisiteIds);

        let latestBoundary = null;

        state.planTerms.forEach(function (planTerm)
        {
            const containsRelevantPrerequisite = planTerm.courses.some(function (courseId)
            {
                return prerequisiteIds.has(courseId);
            });

            if (!containsRelevantPrerequisite)
            {
                return;
            }

            const value = periodValue(planTerm);

            if (latestBoundary === null || value > latestBoundary)
            {
                latestBoundary = value;
            }
        });

        return latestBoundary;
    }

    function highlightDragSemesters(course)
    {
        clearDragHighlights();

        const prerequisiteBoundary = prerequisiteBoundaryValue(course);

        state.planTerms.forEach(function (planTerm)
        {
            const column = document.querySelector(
                '.plan-column[data-plan-id="' + planTerm.id + '"]'
            );

            if (!column)
            {
                return;
            }

            const isSameOrEarlierThanPrerequisite =
                prerequisiteBoundary !== null &&
                periodValue(planTerm) <= prerequisiteBoundary;

            const isNotOffered =
                !offeredInTerm(course, planTerm.term);

            if (isSameOrEarlierThanPrerequisite || isNotOffered)
            {
                column.classList.add('invalid-destination-highlight');
            }
        });
    }

    function invalidPlannedCourses()
    {
        const invalid = new Set();

        state.planTerms.forEach(function (planTerm)
        {
            planTerm.courses.forEach(function (courseId)
            {
                const course = courseMap.get(courseId);

                if (course && !plannedCourseIsValid(course, planTerm))
                {
                    invalid.add(planTerm.id + ':' + courseId);
                }
            });
        });

        return invalid;
    }

    function newlyInvalidCourses(beforeInvalid, afterInvalid)
    {
        return Array.from(afterInvalid).filter(function (key)
        {
            return !beforeInvalid.has(key);
        });
    }

    function evaluateRequirement(requirement, satisfiedCourses)
    {
        if (!requirement)
        {
            return true;
        }

        if (typeof requirement === 'string')
        {
            return satisfiedCourses.has(requirement);
        }

        if (Array.isArray(requirement))
        {
            return requirement.every(function (item)
            {
                return evaluateRequirement(item, satisfiedCourses);
            });
        }

        if (Array.isArray(requirement.all))
        {
            return requirement.all.every(function (item)
            {
                return evaluateRequirement(item, satisfiedCourses);
            });
        }

        if (Array.isArray(requirement.any))
        {
            return requirement.any.some(function (item)
            {
                return evaluateRequirement(item, satisfiedCourses);
            });
        }

        return false;
    }

    function prerequisiteStatus(course, planTerm)
    {
        return evaluateRequirement(
            course.prerequisites,
            satisfiedCoursesBefore(planTerm)
        );
    }

    function corequisiteStatus(course, planTerm)
    {
        if (!course.corequisites)
        {
            return true;
        }

        const satisfied = satisfiedCoursesBefore(planTerm);

        if (planTerm)
        {
            planTerm.courses.forEach(function (courseId)
            {
                satisfied.add(courseId);
            });
        }

        return evaluateRequirement(course.corequisites, satisfied);
    }

    function isCoursePlanned(courseId)
    {
        return state.planTerms.some(function (planTerm)
        {
            return planTerm.courses.includes(courseId);
        });
    }

    function plannedPeriod(courseId)
    {
        return state.planTerms.find(function (planTerm)
        {
            return planTerm.courses.includes(courseId);
        }) || null;
    }

    function isElectiveRequirementSatisfied(ignoreCourseId)
    {
        return advisorData.courses.some(function (course)
        {
            if (course.category !== 'elective' || course.id === ignoreCourseId)
            {
                return false;
            }

            return state.completed.has(course.id) || isCoursePlanned(course.id);
        });
    }

    function offeredInTerm(course, term)
    {
        return course.offered.includes(term);
    }

    function offeredSemesterNames(course)
    {
        if (!course.offered.length)
        {
            return 'Check current schedule';
        }

        return course.offered.join(', ');
    }

    function getCourseStatus(course)
    {
        if (state.completed.has(course.id))
        {
            return {
                label: 'Completed',
                className: 'status-completed',
                cardClass: 'is-completed'
            };
        }

        const planned = plannedPeriod(course.id);

        if (planned)
        {
            return {
                label: 'Planned - ' + planLabel(planned),
                className: 'status-planned',
                cardClass: 'is-planned'
            };
        }

        if (course.category === 'elective' && isElectiveRequirementSatisfied(course.id))
        {
            return {
                label: 'Elective Satisfied',
                className: 'status-locked',
                cardClass: 'is-locked'
            };
        }

        const activePlan = getActivePlanTerm();

        if (!activePlan)
        {
            return {
                label: 'Select Planning Semester',
                className: 'status-not-offered',
                cardClass: 'is-locked'
            };
        }

        if (!prerequisiteStatus(course, activePlan))
        {
            return {
                label: 'Prerequisite Needed',
                className: 'status-locked',
                cardClass: 'is-locked'
            };
        }

        if (!offeredInTerm(course, activePlan.term))
        {
            return {
                label: 'Not Offered ' + activePlan.term,
                className: 'status-not-offered',
                cardClass: 'is-locked'
            };
        }

        if (!corequisiteStatus(course, activePlan))
        {
            return {
                label: 'Corequisite Needed',
                className: 'status-locked',
                cardClass: 'is-locked'
            };
        }

        return {
            label: 'Available ' + activePlan.term,
            className: 'status-available',
            cardClass: 'is-available'
        };
    }

    function updateRequirementGroup(group)
    {
        if (group.mode === 'one')
        {
            const selected = group.courses.find(function (course)
            {
                return state.completed.has(course.id);
            });

            group.courses.forEach(function (course)
            {
                const input = document.getElementById('foundation-' + course.id);

                if (!input)
                {
                    return;
                }

                const option = input.closest('.foundation-option');

                if (selected && selected.id !== course.id)
                {
                    input.disabled = true;
                    option.classList.add('is-disabled');
                }
                else
                {
                    input.disabled = false;
                    option.classList.remove('is-disabled');
                }
            });

            return;
        }

        if (group.mode !== 'pathway' || !Array.isArray(group.pathways))
        {
            return;
        }

        const completedPath = group.pathways.find(function (pathway)
        {
            return pathway.every(function (courseId)
            {
                return state.completed.has(courseId);
            });
        });

        if (completedPath)
        {
            const allowedIds = new Set(completedPath);

            group.courses.forEach(function (course)
            {
                if (!allowedIds.has(course.id))
                {
                    state.completed.delete(course.id);
                }
            });
        }

        group.courses.forEach(function (course)
        {
            const input = document.getElementById('foundation-' + course.id);

            if (!input)
            {
                return;
            }

            const option = input.closest('.foundation-option');
            const isUsedByPath =
                completedPath && completedPath.includes(course.id);

            if (completedPath && !isUsedByPath)
            {
                input.checked = false;
                input.disabled = true;
                option.classList.add('is-disabled');
            }
            else
            {
                input.disabled = false;
                option.classList.remove('is-disabled');
            }
        });
    }

    function createFoundationInterface()
    {
        foundationContainer.innerHTML = '';

        advisorData.foundationGroups.forEach(function (group)
        {
            const groupElement = document.createElement('article');
            groupElement.className = 'foundation-group';

            const heading = document.createElement('h3');
            heading.textContent = group.title;

            const note = document.createElement('p');
            note.className = 'foundation-group-note';
            note.textContent = group.note;

            const options = document.createElement('div');
            options.className = 'foundation-options';

            group.courses.forEach(function (course)
            {
                const label = document.createElement('label');
                label.className = 'foundation-option';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = 'foundation-' + course.id;
                input.checked = state.completed.has(course.id);

                input.addEventListener('change', function ()
                {
                    if (input.checked)
                    {
                        if (group.mode === 'one')
                        {
                            group.courses.forEach(function (otherCourse)
                            {
                                if (otherCourse.id !== course.id)
                                {
                                    state.completed.delete(otherCourse.id);
                                }
                            });
                        }

                        state.completed.add(course.id);
                    }
                    else
                    {
                        state.completed.delete(course.id);
                    }

                    saveState();
                    renderEverything();
                });

                const text = document.createElement('span');

                const code = document.createElement('span');
                code.className = 'foundation-code';
                code.textContent = course.id;

                text.appendChild(code);
                text.appendChild(document.createTextNode(course.title));

                label.appendChild(input);
                label.appendChild(text);
                options.appendChild(label);
            });

            groupElement.appendChild(heading);
            groupElement.appendChild(note);
            groupElement.appendChild(options);

            if (group.mode === 'pathway')
            {
                const pathwayNote = document.createElement('p');
                pathwayNote.className = 'pathway-note';
                pathwayNote.textContent =
                    'Valid paths: EET3086 OR (EET3085 AND EET1021C) OR (EET1011C AND EET1021C). Once one path is complete, unused alternatives are disabled.';
                groupElement.appendChild(pathwayNote);
            }

            foundationContainer.appendChild(groupElement);
            updateRequirementGroup(group);
        });
    }

    function setCourseCompleted(courseId, completed)
    {
        if (completed)
        {
            state.completed.add(courseId);

            state.planTerms.forEach(function (planTerm)
            {
                planTerm.courses = planTerm.courses.filter(function (plannedId)
                {
                    return plannedId !== courseId;
                });
            });
        }
        else
        {
            state.completed.delete(courseId);
        }

        saveState();
        renderEverything();
    }

    function showCourseDetails(course)
    {
        detailsContainer.innerHTML = '';

        const heading = document.createElement('h3');
        heading.textContent = course.id + ' - ' + course.title;

        const grid = document.createElement('div');
        grid.className = 'details-grid';

        const credits = document.createElement('p');
        credits.innerHTML = '<strong>Credits:</strong> ' + course.credits;

        const category = document.createElement('p');
        category.innerHTML =
            '<strong>Requirement:</strong> ' +
            (course.category === 'required' ? 'BSIT Required Course' : '3-Credit Program Elective');

        const offered = document.createElement('p');
        offered.innerHTML = '<strong>Offered:</strong> ' + offeredSemesterNames(course);

        const prereq = document.createElement('p');
        prereq.innerHTML =
            '<strong>Prerequisite/Corequisite:</strong> ' +
            (course.prerequisiteText || 'None');

        grid.appendChild(credits);
        grid.appendChild(category);
        grid.appendChild(offered);
        grid.appendChild(prereq);

        const note = document.createElement('p');
        note.className = 'details-note';
        note.textContent = course.note;

        const source = document.createElement('p');
        const sourceLink = document.createElement('a');
        sourceLink.href = course.catalogUrl;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener';
        sourceLink.textContent = 'Open official catalog course description';
        source.appendChild(sourceLink);

        detailsContainer.appendChild(heading);
        detailsContainer.appendChild(grid);
        detailsContainer.appendChild(note);
        detailsContainer.appendChild(source);

        document.getElementById('details-section').scrollIntoView(
        {
            behavior: 'smooth',
            block: 'start'
        });
    }

    function createCourseCard(course)
    {
        const status = getCourseStatus(course);
        const card = document.createElement('article');

        card.className = 'course-card ' + status.cardClass;
        card.dataset.courseId = course.id;

        const head = document.createElement('div');
        head.className = 'course-card-head';

        const titleWrap = document.createElement('div');

        const code = document.createElement('div');
        code.className = 'course-code';
        code.textContent = course.id;

        const title = document.createElement('h3');
        title.textContent = course.title;

        titleWrap.appendChild(code);
        titleWrap.appendChild(title);

        const badge = document.createElement('span');
        badge.className = 'course-status ' + status.className;
        badge.textContent = status.label;

        head.appendChild(titleWrap);
        head.appendChild(badge);

        const meta = document.createElement('p');
        meta.className = 'course-meta';
        meta.textContent =
            course.credits + ' credits • Offered: ' + offeredSemesterNames(course);

        const prereq = document.createElement('p');
        prereq.className = 'course-prereq';
        prereq.innerHTML =
            '<strong>Requirement:</strong> ' + (course.prerequisiteText || 'None');

        const actions = document.createElement('div');
        actions.className = 'course-actions';

        const detailsButton = document.createElement('button');
        detailsButton.type = 'button';
        detailsButton.className = 'course-button';
        detailsButton.textContent = 'Details';
        detailsButton.addEventListener('click', function ()
        {
            showCourseDetails(course);
        });

        const completeButton = document.createElement('button');
        completeButton.type = 'button';
        completeButton.className = 'course-button complete-button';
        completeButton.textContent =
            state.completed.has(course.id) ? 'Mark Not Completed' : 'Mark Completed';

        completeButton.addEventListener('click', function ()
        {
            setCourseCompleted(course.id, !state.completed.has(course.id));
        });

        actions.appendChild(detailsButton);
        actions.appendChild(completeButton);

        card.appendChild(head);
        card.appendChild(meta);
        card.appendChild(prereq);
        card.appendChild(actions);

        return card;
    }

    function renderProgramCourses()
    {
        programContainer.innerHTML = '';

        advisorData.courses.forEach(function (course)
        {
            programContainer.appendChild(createCourseCard(course));
        });
    }

    function eligibleCoursesForPlanning()
    {
        return advisorData.courses.filter(function (course)
        {
            if (state.completed.has(course.id) || isCoursePlanned(course.id))
            {
                return false;
            }

            if (course.category === 'elective' && isElectiveRequirementSatisfied(course.id))
            {
                return false;
            }

            return prerequisiteReadyForPlanningList(course);
        });
    }

    function renderAvailableCourses()
    {
        availableContainer.innerHTML = '';

        const availableCourses = eligibleCoursesForPlanning();
        availableCountOutput.textContent = availableCourses.length;

        if (!availableCourses.length)
        {
            const empty = document.createElement('p');
            empty.className = 'available-empty';
            empty.textContent =
                'No additional program courses currently have all prerequisites completed or planned.';
            availableContainer.appendChild(empty);
            return;
        }

        availableCourses.forEach(function (course)
        {
            const item = document.createElement('article');
            item.className = 'available-item';
            item.dataset.courseId = course.id;
            item.draggable = true;

            item.addEventListener('dragstart', function (event)
            {
                beginCourseDrag(
                    event,
                    item,
                    course,
                    null
                );
            });

            item.addEventListener('dragend', function ()
            {
                endCourseDrag(item);
            });

            const code = document.createElement('strong');
            code.textContent = course.id + ' - ' + course.title;

            const text = document.createElement('div');
            text.textContent =
                course.credits + ' credits • ' +
                (course.category === 'elective' ? 'Program Elective' : 'Required');

            const offered = document.createElement('div');
            offered.className = 'available-terms';
            offered.textContent = 'Offered: ' + offeredSemesterNames(course);

            item.appendChild(code);
            item.appendChild(text);
            item.appendChild(offered);

            availableContainer.appendChild(item);
        });
    }

    function plannedCourseIsValid(course, planTerm)
    {
        if (!offeredInTerm(course, planTerm.term))
        {
            return false;
        }

        if (!prerequisiteStatus(course, planTerm))
        {
            return false;
        }

        if (!corequisiteStatus(course, planTerm))
        {
            return false;
        }

        return true;
    }

    function selectPlanTerm(planId)
    {
        state.activePlanId = planId;
        saveState();
        renderEverything(false);
    }

    function removePlanTerm(planId)
    {
        const planTerm = getPlanTerm(planId);

        if (!planTerm)
        {
            return;
        }

        if (planTerm.courses.length)
        {
            const remove = window.confirm(
                'Remove ' + planLabel(planTerm) +
                ' and all courses currently planned in it?'
            );

            if (!remove)
            {
                return;
            }
        }

        state.planTerms = state.planTerms.filter(function (candidate)
        {
            return candidate.id !== planId;
        });

        if (state.activePlanId === planId)
        {
            state.activePlanId = state.planTerms.length ?
                state.planTerms[state.planTerms.length - 1].id :
                null;
        }

        saveState();
        showPlanMessage(planLabel(planTerm) + ' was removed from the degree plan.', false);
        renderEverything(false);
    }

    function renderPlan()
    {
        planGrid.innerHTML = '';
        sortPlanTerms();

        const activePlan = getActivePlanTerm();

        if (activePlan)
        {
            activePlanBanner.innerHTML =
                '<strong>Active planning semester:</strong> ' +
                planLabel(activePlan) +
                '. Courses planned before this semester count toward prerequisites.';
        }
        else
        {
            activePlanBanner.textContent =
                'Add a semester below to begin building your degree plan.';
        }

        if (!state.planTerms.length)
        {
            const empty = document.createElement('p');
            empty.className = 'available-empty plan-empty';
            empty.textContent =
                'No semesters have been added. Choose a semester and year above, then select Add Semester.';
            planGrid.appendChild(empty);
            return;
        }

        state.planTerms.forEach(function (planTerm)
        {
            const column = document.createElement('article');
            column.className = 'plan-column';
            column.dataset.planId = planTerm.id;

            if (planTerm.id === state.activePlanId)
            {
                column.classList.add('is-active');
            }

            const heading = document.createElement('h3');
            heading.textContent = planLabel(planTerm);

            const controls = document.createElement('div');
            controls.className = 'plan-column-actions';

            const selectButton = document.createElement('button');
            selectButton.type = 'button';
            selectButton.className = 'course-button plan-select-button';
            selectButton.textContent =
                planTerm.id === state.activePlanId ? 'Active Semester' : 'Plan This Semester';
            selectButton.disabled = planTerm.id === state.activePlanId;
            selectButton.addEventListener('click', function ()
            {
                selectPlanTerm(planTerm.id);
            });

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'course-button remove-semester-button';
            removeButton.textContent = 'Remove Semester';
            removeButton.addEventListener('click', function ()
            {
                removePlanTerm(planTerm.id);
            });

            controls.appendChild(selectButton);
            controls.appendChild(removeButton);

            const zone = document.createElement('div');
            zone.className = 'drop-zone';
            zone.dataset.planId = planTerm.id;
            zone.tabIndex = 0;
            zone.setAttribute(
                'aria-label',
                planLabel(planTerm) + ' course plan'
            );

            zone.addEventListener('dragover', function (event)
            {
                event.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', function ()
            {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', function (event)
            {
                event.preventDefault();
                zone.classList.remove('drag-over');
                clearDragHighlights();

                const fallbackCourseId =
                    event.dataTransfer.getData('text/plain');

                const dragData = activeDrag ||
                {
                    courseId: fallbackCourseId,
                    sourcePlanId: null
                };

                if (!dragData || !dragData.courseId)
                {
                    showPlanMessage(
                        'The course could not be read from the drag operation. Try dragging the course card again.',
                        true
                    );
                    return;
                }

                if (dragData.sourcePlanId)
                {
                    moveCourseToPlan(
                        dragData.courseId,
                        dragData.sourcePlanId,
                        planTerm.id
                    );
                }
                else
                {
                    addCourseToPlan(
                        dragData.courseId,
                        planTerm.id
                    );
                }

                activeDrag = null;
                document.body.classList.remove('course-drag-active');
                removeDragPreview();
            });

            planTerm.courses.forEach(function (courseId)
            {
                const course = courseMap.get(courseId);

                if (!course)
                {
                    return;
                }

                const planned = document.createElement('div');
                planned.className = 'planned-course';
                planned.draggable = true;
                planned.title = 'Drag this course to another valid semester.';

                planned.addEventListener('dragstart', function (event)
                {
                    beginCourseDrag(
                        event,
                        planned,
                        course,
                        planTerm.id
                    );
                });

                planned.addEventListener('dragend', function ()
                {
                    endCourseDrag(planned);
                });

                if (!plannedCourseIsValid(course, planTerm))
                {
                    planned.classList.add('is-invalid');
                }

                const name = document.createElement('strong');
                name.textContent = course.id + ' - ' + course.title;

                const credits = document.createElement('span');
                credits.textContent = course.credits + ' credits';

                if (!plannedCourseIsValid(course, planTerm))
                {
                    const warning = document.createElement('span');
                    warning.className = 'sequence-warning';
                    warning.textContent = 'Check prerequisite sequence';
                    planned.appendChild(warning);
                }

                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'remove-plan';
                remove.textContent = 'Remove';
                remove.addEventListener('click', function ()
                {
                    planTerm.courses = planTerm.courses.filter(function (id)
                    {
                        return id !== course.id;
                    });

                    saveState();
                    showPlanMessage(
                        course.id + ' was removed from ' + planLabel(planTerm) + '.',
                        false
                    );
                    renderEverything(false);
                });

                const moveHint = document.createElement('span');
                moveHint.className = 'planned-move-hint';
                moveHint.textContent = 'Drag to move';

                planned.appendChild(name);
                planned.appendChild(credits);
                planned.appendChild(moveHint);
                planned.appendChild(remove);
                zone.appendChild(planned);
            });

            const total = document.createElement('p');
            total.className = 'plan-total';
            total.innerHTML =
                'Credits: <strong>' + planCredits(planTerm) + '</strong>';

            column.appendChild(heading);
            column.appendChild(controls);
            column.appendChild(zone);
            column.appendChild(total);

            planGrid.appendChild(column);
        });
    }

    function planCredits(planTerm)
    {
        return planTerm.courses.reduce(function (total, courseId)
        {
            const course = courseMap.get(courseId);
            return total + (course ? course.credits : 0);
        }, 0);
    }

    function moveCourseToPlan(courseId, sourcePlanId, targetPlanId)
    {
        const course = courseMap.get(courseId);
        const sourcePlan = getPlanTerm(sourcePlanId);
        const targetPlan = getPlanTerm(targetPlanId);

        if (!course || !sourcePlan || !targetPlan)
        {
            return;
        }

        if (sourcePlan.id === targetPlan.id)
        {
            showPlanMessage(
                course.id + ' is already planned in ' + planLabel(sourcePlan) + '.',
                false
            );
            renderEverything(false);
            return;
        }

        if (!offeredInTerm(course, targetPlan.term))
        {
            showPlanMessage(
                course.id + ' is not listed as offered in ' + targetPlan.term + '.',
                true
            );
            renderEverything(false);
            return;
        }

        const beforeInvalid = invalidPlannedCourses();

        sourcePlan.courses = sourcePlan.courses.filter(function (id)
        {
            return id !== course.id;
        });

        targetPlan.courses.push(course.id);

        const courseValidInTarget =
            prerequisiteStatus(course, targetPlan) &&
            corequisiteStatus(course, targetPlan);

        const afterInvalid = invalidPlannedCourses();
        const newProblems = newlyInvalidCourses(beforeInvalid, afterInvalid);

        if (!courseValidInTarget || newProblems.length)
        {
            targetPlan.courses = targetPlan.courses.filter(function (id)
            {
                return id !== course.id;
            });

            sourcePlan.courses.push(course.id);

            if (!courseValidInTarget)
            {
                showPlanMessage(
                    course.id + ' cannot be moved to ' + planLabel(targetPlan) +
                    ' because its prerequisite or corequisite sequence would not be satisfied.',
                    true
                );
            }
            else
            {
                const affected = newProblems.map(function (key)
                {
                    return key.split(':')[1];
                });

                showPlanMessage(
                    course.id + ' cannot be moved to ' + planLabel(targetPlan) +
                    ' because it would break the prerequisite sequence for ' +
                    affected.join(', ') + '.',
                    true
                );
            }

            renderEverything(false);
            return;
        }

        saveState();
        showPlanMessage(
            course.id + ' was moved from ' + planLabel(sourcePlan) +
            ' to ' + planLabel(targetPlan) + '.',
            false
        );
        renderEverything(false);
    }

    function addCourseToPlan(courseId, planId)
    {
        const course = courseMap.get(courseId);
        const planTerm = getPlanTerm(planId);

        if (!course || !planTerm)
        {
            return;
        }

        if (state.completed.has(course.id))
        {
            showPlanMessage(course.id + ' is already marked completed.', true);
            return;
        }

        if (isCoursePlanned(course.id))
        {
            showPlanMessage(course.id + ' is already in the degree plan.', true);
            return;
        }

        if (course.category === 'elective' && isElectiveRequirementSatisfied(course.id))
        {
            showPlanMessage(
                'The 3-credit program elective requirement is already satisfied or planned.',
                true
            );
            return;
        }

        if (!prerequisiteStatus(course, planTerm))
        {
            showPlanMessage(
                course.id + ' requires prerequisite courses to be completed or planned in an earlier semester.',
                true
            );
            return;
        }

        if (!offeredInTerm(course, planTerm.term))
        {
            showPlanMessage(
                course.id + ' is not listed as offered in ' + planTerm.term + '.',
                true
            );
            return;
        }

        planTerm.courses.push(course.id);

        if (!corequisiteStatus(course, planTerm))
        {
            planTerm.courses = planTerm.courses.filter(function (id)
            {
                return id !== course.id;
            });

            showPlanMessage(
                course.id + ' requires its corequisite to be completed earlier or planned in the same semester.',
                true
            );
            return;
        }

        saveState();
        showPlanMessage(
            course.id + ' was added to ' + planLabel(planTerm) + '.',
            false
        );
        renderEverything(false);
    }

    function showPlanMessage(message, isError)
    {
        planMessage.textContent = message;
        planMessage.classList.toggle('is-error', isError);
    }

    function addSemester()
    {
        const term = planTermSelect.value;
        const year = Number(planYearInput.value);

        if (!advisorData.terms.includes(term))
        {
            showPlanMessage('Select a valid semester.', true);
            return;
        }

        if (!Number.isInteger(year) || year < 2026 || year > 2036)
        {
            showPlanMessage('Enter a year from 2026 through 2036.', true);
            return;
        }

        const planId = makePlanId(term, year);
        const existing = getPlanTerm(planId);

        if (existing)
        {
            state.activePlanId = existing.id;
            saveState();
            showPlanMessage(planLabel(existing) + ' is already in the plan and is now active.', false);
            renderEverything(false);
            return;
        }

        const planTerm =
        {
            id: planId,
            term: term,
            year: year,
            courses: []
        };

        state.planTerms.push(planTerm);
        sortPlanTerms();
        state.activePlanId = planId;

        saveState();
        showPlanMessage(planLabel(planTerm) + ' was added and selected for planning.', false);
        renderEverything(false);
    }

    function completedProgramCredits()
    {
        let electiveCounted = false;

        return advisorData.courses.reduce(function (total, course)
        {
            if (!state.completed.has(course.id))
            {
                return total;
            }

            if (course.category === 'elective')
            {
                if (electiveCounted)
                {
                    return total;
                }

                electiveCounted = true;
            }

            return total + course.credits;
        }, 0);
    }

    function plannedProgramCredits()
    {
        let electiveCounted =
            advisorData.courses.some(function (course)
            {
                return course.category === 'elective' &&
                    state.completed.has(course.id);
            });

        let total = 0;

        state.planTerms.forEach(function (planTerm)
        {
            planTerm.courses.forEach(function (courseId)
            {
                const course = courseMap.get(courseId);

                if (!course)
                {
                    return;
                }

                if (course.category === 'elective')
                {
                    if (electiveCounted)
                    {
                        return;
                    }

                    electiveCounted = true;
                }

                total += course.credits;
            });
        });

        return total;
    }

    function updateSummary()
    {
        completedCreditsOutput.textContent = completedProgramCredits();
        plannedCreditsOutput.textContent = plannedProgramCredits();

        const electiveSatisfied = advisorData.courses.some(function (course)
        {
            return course.category === 'elective' &&
                (state.completed.has(course.id) || isCoursePlanned(course.id));
        });

        electiveStatusOutput.textContent =
            electiveSatisfied ? '3 / 3' : '0 / 3';
    }

    function renderEverything(rebuildFoundation)
    {
        if (rebuildFoundation !== false)
        {
            createFoundationInterface();
        }

        renderProgramCourses();
        renderAvailableCourses();
        renderPlan();
        updateSummary();
    }

    function loadAdvisorExample()
    {
        state.completed.clear();
        state.planTerms = [];
        state.activePlanId = null;

        [
            'ENC1101',
            'MAC1105',
            'MAC1114',
            'COP1000',
            'COP2800',
            'MAC2311C',
            'STA2023',
            'MAD2104',
            'CET1112C',
            'EET1011C',
            'EET1021C',
            'MAC1140',
            'CET1600'
        ].forEach(function (courseId)
        {
            state.completed.add(courseId);
        });

        showPlanMessage(
            'Advisor example loaded. Only the prerequisite checkboxes were filled; no semesters or program courses were added.',
            false
        );

        renderEverything();
    }

    function resetAdvisor()
    {
        state.completed.clear();
        state.planTerms = [];
        state.activePlanId = null;

        detailsContainer.innerHTML =
            '<p>Select the <strong>Details</strong> button on any program course to view information here.</p>';

        showPlanMessage('Advisor reset. Everything is blank. Mark completed courses and add semesters manually to begin.', false);
        renderEverything();
    }

    async function loadAdvisorData()
    {
        try
        {
            const response = await fetch(dataFile, { cache: 'no-store' });

            if (!response.ok)
            {
                throw new Error('HTTP status ' + response.status);
            }

            const jsonText = await response.text();
            advisorData = JSON.parse(jsonText);

            advisorData.courses.forEach(function (course)
            {
                courseMap.set(course.id, course);
            });

            loadState();

            planTermSelect.disabled = false;
            planYearInput.disabled = false;
            addSemesterButton.disabled = false;
            if (exampleButton)
            {
                exampleButton.disabled = false;
            }
            resetButton.disabled = false;

            addSemesterButton.addEventListener('click', addSemester);
            if (exampleButton)
            {
                exampleButton.addEventListener('click', loadAdvisorExample);
            }
            resetButton.addEventListener('click', resetAdvisor);

            renderEverything();

            dataStatus.textContent =
                advisorData.program.degree + ' in ' + advisorData.program.name +
                ' • Catalog ' + advisorData.program.catalogYear +
                ' • ' + advisorData.courses.length +
                ' program courses loaded from JSON.';
        }
        catch (error)
        {
            console.error(error);

            dataStatus.textContent =
                'The external BSIT JSON file could not be loaded. View this page through GitHub Pages or another web server rather than opening the HTML file directly.';
        }
    }

    loadAdvisorData();
});