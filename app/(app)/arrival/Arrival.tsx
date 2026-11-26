"use client";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toggleArrivalTask } from "@/app/actions";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Action, PageHeading, TextLink } from "@/components/ui";
import type { ArrivalTask } from "@/lib/types";
import { arrivalSections } from "@/lib/ui";

export function Arrival({
  tasks,
  completed: initialCompleted,
  initialTab,
}: {
  tasks: ArrivalTask[];
  completed: number[];
  initialTab: number;
}) {
  const { report } = useShell();
  const [arrivalTab, setArrivalTab] = useState(initialTab);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [completed, setCompleted] = useOptimistic(
    initialCompleted,
    (state, { id, done }: { id: number; done: boolean }) =>
      done ? [...state, id] : state.filter((item) => item !== id),
  );
  const [, startTransition] = useTransition();
  const toggle = (id: number) => {
    const done = !completed.includes(id);
    startTransition(async () => {
      setCompleted({ id, done });
      report(await toggleArrivalTask(id, done));
    });
  };
  const total = tasks.length;
  const done = tasks.filter((task) => completed.includes(task.id)).length;
  const percent = total ? (done / total) * 100 : 0;
  const sectionTasks = tasks.filter((task) => task.section === arrivalTab);

  return (
    <>
      <PageHeading
        eyebrow="YOUR FIRST CHAPTER"
        title="A little preparation. A softer landing."
        description="Your step-by-step guide to arriving, settling in, and finding your feet at UTM."
      />
      <div className="arrival-summary surface">
        <div>
          <span className="small-label">YOUR SETTLING-IN CHECKLIST</span>
          <h2>
            {done} of {total} steps completed
          </h2>
          <p>At your pace. One thing at a time.</p>
        </div>
        <div>
          <strong className="progress-percent">
            {Math.round(percent)}
            <span>%</span>
          </strong>
          <div className="progress-track">
            <div style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
      <div className="tabs" aria-label="Arrival stages">
        {arrivalSections.map((section, index) => {
          const inSection = tasks.filter((task) => task.section === index);
          return (
            <button
              key={section}
              className={arrivalTab === index ? "active" : ""}
              aria-pressed={arrivalTab === index}
              onClick={() => setArrivalTab(index)}
            >
              <span className="tab-number">0{index + 1}</span>
              {section}
              <span className="tab-count">
                {inSection.filter((task) => completed.includes(task.id)).length}/{inSection.length}
              </span>
            </button>
          );
        })}
      </div>
      <div className="content-with-aside">
        <section>
          <div className="section-heading">
            <h2>{arrivalSections[arrivalTab]}</h2>
            <span>{sectionTasks.length} practical steps</span>
          </div>
          <div className="task-list">
            {sectionTasks.map((task) => (
              <article
                className={`task-card surface ${completed.includes(task.id) ? "completed" : ""}`}
                key={task.id}
              >
                <div className="task-heading">
                  <label className="task-checkbox">
                    <input
                      type="checkbox"
                      checked={completed.includes(task.id)}
                      onChange={() => toggle(task.id)}
                    />
                    <span className="sr-only">Complete {task.title}</span>
                  </label>
                  <button
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    aria-expanded={expandedTask === task.id}
                  >
                    <span>
                      <h3>{task.title}</h3>
                      <p>
                        {completed.includes(task.id)
                          ? "Completed — nicely done"
                          : "View guidance & required documents"}
                      </p>
                    </span>
                    <Icon
                      name="chevron"
                      className={expandedTask === task.id ? "rotate" : ""}
                      size={19}
                    />
                  </button>
                </div>
                {expandedTask === task.id && (
                  <div className="task-detail">
                    <p>{task.detail}</p>
                    <div className="document-box">
                      <strong>What to bring</strong>
                      <p>{task.documents}</p>
                    </div>
                    {task.url && (
                      <a href={task.url} target="_blank" rel="noreferrer" className="text-link">
                        {task.link || "Official information"}
                        <Icon name="external" size={15} />
                      </a>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          <div className="spread-actions">
            {arrivalTab > 0 ? (
              <Action variant="outline" onClick={() => setArrivalTab(arrivalTab - 1)}>
                Previous stage
              </Action>
            ) : (
              <span />
            )}
            {arrivalTab < arrivalSections.length - 1 ? (
              <Action variant="navy" onClick={() => setArrivalTab(arrivalTab + 1)}>
                Next stage
                <Icon name="arrow" size={17} />
              </Action>
            ) : (
              <Link className="button navy" href="/">
                Back to your overview
                <Icon name="arrow" size={17} />
              </Link>
            )}
          </div>
        </section>
        <aside className="guidance-card">
          <Icon name="buddy" size={26} />
          <h3>You have a helping hand.</h3>
          <p>
            Your buddy can help with local questions, campus directions and those little things a
            handbook can’t explain.
          </p>
          <TextLink href="/buddy">Ask your buddy</TextLink>
          <hr />
          <p className="small-text">
            Requirements can change. Always confirm documents and deadlines with the official
            provider.
          </p>
        </aside>
      </div>
    </>
  );
}
