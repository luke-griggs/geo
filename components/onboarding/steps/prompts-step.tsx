"use client";

import {
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Pencil,
} from "lucide-react";
import { useOnboarding } from "../context";
import { DomainLogo } from "../shared";

export function PromptsStep() {
  const {
    analysisResult,
    cleanedWebsite,
    topicsWithPrompts,
    setTopicsWithPrompts,
    isGeneratingPrompts,
    isSubmittingPrompts,
    setIsSubmittingPrompts,
    submitError,
    setSubmitError,
    showSubmitModal,
    setShowSubmitModal,
    totalPromptCount,
    generatePromptId,
    router,
    // Prompt editing state
    editingPromptId,
    setEditingPromptId,
    editingPromptText,
    setEditingPromptText,
    addingPromptToTopic,
    setAddingPromptToTopic,
    newPromptText,
    setNewPromptText,
    showAddPromptDropdown,
    setShowAddPromptDropdown,
    isAddingNewTopic,
    setIsAddingNewTopic,
    newTopicName,
    setNewTopicName,
    editingTopicName,
    setEditingTopicName,
    editingTopicNameText,
    setEditingTopicNameText,
    openTopicMenu,
    setOpenTopicMenu,
  } = useOnboarding();

  if (!analysisResult) return null;

  // Submit prompts: create org/domain, save prompts, trigger parallel run, redirect
  const handleSubmitPrompts = async () => {
    if (!analysisResult || topicsWithPrompts.length === 0) return;

    setIsSubmittingPrompts(true);
    setSubmitError(null);

    try {
      // 1. Create organization with domain
      const orgRes = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: analysisResult.brandName,
          domain: cleanedWebsite,
        }),
      });

      if (!orgRes.ok) {
        const errorData = await orgRes.json();
        throw new Error(errorData.error || "Failed to create organization");
      }

      const { organization, domain: createdDomain } = await orgRes.json();

      if (!createdDomain) {
        throw new Error("Failed to create domain");
      }

      // 2. Create topics in the database
      const topicsToCreate = topicsWithPrompts.map((topic) => ({
        name: topic.name,
        description: topic.description,
      }));

      const topicsRes = await fetch(
        `/api/organizations/${organization.id}/domains/${createdDomain.id}/topics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topics: topicsToCreate }),
        }
      );

      if (!topicsRes.ok) {
        const errorData = await topicsRes.json();
        throw new Error(errorData.error || "Failed to save topics");
      }

      const { topics: createdTopics } = await topicsRes.json();

      // Create a map of topic names to their IDs
      const topicNameToId: Record<string, string> = {};
      createdTopics.forEach((t: { id: string; name: string }) => {
        topicNameToId[t.name] = t.id;
      });

      // 3. Collect all prompts from all topics with their topic IDs
      const allPrompts = topicsWithPrompts.flatMap((topic) =>
        topic.prompts.map((p) => ({
          promptText: p.text,
          topicId: topicNameToId[topic.name],
        }))
      );

      // 4. Save prompts to database using bulk API
      const promptsRes = await fetch(
        `/api/organizations/${organization.id}/domains/${createdDomain.id}/prompts/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompts: allPrompts }),
        }
      );

      if (!promptsRes.ok) {
        const errorData = await promptsRes.json();
        throw new Error(errorData.error || "Failed to save prompts");
      }

      // 5. Trigger parallel prompt runs (fire and forget)
      fetch(
        `/api/organizations/${organization.id}/domains/${createdDomain.id}/run-parallel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      ).catch((err) => {
        console.error("Error triggering parallel run:", err);
      });

      // 6. Clear onboarding progress from localStorage
      localStorage.removeItem("onboarding_progress");

      // 7. Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Error submitting prompts:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit prompts"
      );
      setIsSubmittingPrompts(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DomainLogo domain={analysisResult.domain} className="w-6 h-6" />
            <span className="font-semibold text-gray-900">
              {analysisResult.brandName}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">{analysisResult.domain}</span>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={totalPromptCount === 0}
            className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Continue to Results
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Review the list of prompts curated for your brand
          </h1>
          <p className="text-gray-500">
            You get 100 prompts total to run each day. We recommend starting
            with 25-50 prompts to begin.
          </p>
        </div>

        {/* Your Prompt List */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Your Prompt List</h2>
            <p className="text-sm text-gray-500">
              We&apos;ve generated {totalPromptCount} prompts for you. Please
              review and submit your prompts.
            </p>
          </div>

          {/* Add Prompt Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAddPromptDropdown(!showAddPromptDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Add Prompt
              <ChevronDown className="w-4 h-4" />
            </button>

            {showAddPromptDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {topicsWithPrompts.map((topic) => (
                    <button
                      key={topic.name}
                      onClick={() => {
                        setAddingPromptToTopic(topic.name);
                        setShowAddPromptDropdown(false);
                        // Expand the topic
                        setTopicsWithPrompts(
                          topicsWithPrompts.map((t) =>
                            t.name === topic.name
                              ? { ...t, isExpanded: true }
                              : t
                          )
                        );
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {topic.name}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsAddingNewTopic(true);
                        setShowAddPromptDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Topic
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isGeneratingPrompts && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">
              Generating prompts for your topics...
            </p>
            <p className="text-gray-400 text-sm mt-1">
              This may take a few moments
            </p>
          </div>
        )}

        {/* Topics Cards */}
        {!isGeneratingPrompts && (
          <div className="space-y-4">
            {/* Topic Cards */}
            {topicsWithPrompts.map((topic) => (
              <div
                key={topic.name}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Topic Header - Gray Background */}
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => {
                      setTopicsWithPrompts(
                        topicsWithPrompts.map((t) =>
                          t.name === topic.name
                            ? { ...t, isExpanded: !t.isExpanded }
                            : t
                        )
                      );
                    }}
                  >
                    {topic.isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    {editingTopicName === topic.name ? (
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingTopicNameText}
                          onChange={(e) =>
                            setEditingTopicNameText(e.target.value)
                          }
                          autoFocus
                          className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] text-sm font-medium"
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              editingTopicNameText.trim()
                            ) {
                              setTopicsWithPrompts(
                                topicsWithPrompts.map((t) =>
                                  t.name === topic.name
                                    ? {
                                        ...t,
                                        name: editingTopicNameText.trim(),
                                      }
                                    : t
                                )
                              );
                              setEditingTopicName(null);
                              setEditingTopicNameText("");
                            } else if (e.key === "Escape") {
                              setEditingTopicName(null);
                              setEditingTopicNameText("");
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (editingTopicNameText.trim()) {
                              setTopicsWithPrompts(
                                topicsWithPrompts.map((t) =>
                                  t.name === topic.name
                                    ? {
                                        ...t,
                                        name: editingTopicNameText.trim(),
                                      }
                                    : t
                                )
                              );
                              setEditingTopicName(null);
                              setEditingTopicNameText("");
                            }
                          }}
                          className="p-1 bg-[#6366f1] text-white rounded hover:bg-[#4f46e5]"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingTopicName(null);
                            setEditingTopicNameText("");
                          }}
                          className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-gray-900">
                          {topic.name}
                        </span>
                        <span className="text-sm text-gray-400">
                          {topic.prompts.length} prompts
                        </span>
                      </>
                    )}
                  </div>
                  {/* Three Dots Menu */}
                  <div className="flex items-center gap-2">
                    {openTopicMenu === topic.name && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTopicName(topic.name);
                            setEditingTopicNameText(topic.name);
                            setOpenTopicMenu(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Topic
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTopicsWithPrompts(
                              topicsWithPrompts.filter(
                                (t) => t.name !== topic.name
                              )
                            );
                            setOpenTopicMenu(null);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenTopicMenu(
                          openTopicMenu === topic.name ? null : topic.name
                        );
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Prompts - White Background */}
                {topic.isExpanded && (
                  <div className="bg-white">
                    {topic.prompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className="group px-4 py-3 pl-10 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                      >
                        {editingPromptId === prompt.id ? (
                          /* Inline Edit Mode */
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingPromptText}
                              onChange={(e) =>
                                setEditingPromptText(e.target.value)
                              }
                              autoFocus
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setTopicsWithPrompts(
                                    topicsWithPrompts.map((t) =>
                                      t.name === topic.name
                                        ? {
                                            ...t,
                                            prompts: t.prompts.map((p) =>
                                              p.id === prompt.id
                                                ? {
                                                    ...p,
                                                    text: editingPromptText,
                                                  }
                                                : p
                                            ),
                                          }
                                        : t
                                    )
                                  );
                                  setEditingPromptId(null);
                                  setEditingPromptText("");
                                } else if (e.key === "Escape") {
                                  setEditingPromptId(null);
                                  setEditingPromptText("");
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                setTopicsWithPrompts(
                                  topicsWithPrompts.map((t) =>
                                    t.name === topic.name
                                      ? {
                                          ...t,
                                          prompts: t.prompts.map((p) =>
                                            p.id === prompt.id
                                              ? {
                                                  ...p,
                                                  text: editingPromptText,
                                                }
                                              : p
                                          ),
                                        }
                                      : t
                                  )
                                );
                                setEditingPromptId(null);
                                setEditingPromptText("");
                              }}
                              className="p-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5]"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingPromptId(null);
                                setEditingPromptText("");
                              }}
                              className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setTopicsWithPrompts(
                                  topicsWithPrompts.map((t) =>
                                    t.name === topic.name
                                      ? {
                                          ...t,
                                          prompts: t.prompts.filter(
                                            (p) => p.id !== prompt.id
                                          ),
                                        }
                                      : t
                                  )
                                );
                                setEditingPromptId(null);
                                setEditingPromptText("");
                              }}
                              className="p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          /* Normal Display Mode */
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">{prompt.text}</span>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPromptId(prompt.id);
                                  setEditingPromptText(prompt.text);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Edit Prompt
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTopicsWithPrompts(
                                    topicsWithPrompts.map((t) =>
                                      t.name === topic.name
                                        ? {
                                            ...t,
                                            prompts: t.prompts.filter(
                                              (p) => p.id !== prompt.id
                                            ),
                                          }
                                        : t
                                    )
                                  );
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Prompt Input */}
                    {addingPromptToTopic === topic.name ? (
                      <div className="px-4 py-3 pl-10 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newPromptText}
                            onChange={(e) => setNewPromptText(e.target.value)}
                            placeholder="Enter new prompt..."
                            autoFocus
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newPromptText.trim()) {
                                setTopicsWithPrompts(
                                  topicsWithPrompts.map((t) =>
                                    t.name === topic.name
                                      ? {
                                          ...t,
                                          prompts: [
                                            ...t.prompts,
                                            {
                                              id: generatePromptId(),
                                              text: newPromptText.trim(),
                                              category: "brand",
                                            },
                                          ],
                                        }
                                      : t
                                  )
                                );
                                setNewPromptText("");
                                setAddingPromptToTopic(null);
                              } else if (e.key === "Escape") {
                                setNewPromptText("");
                                setAddingPromptToTopic(null);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (newPromptText.trim()) {
                                setTopicsWithPrompts(
                                  topicsWithPrompts.map((t) =>
                                    t.name === topic.name
                                      ? {
                                          ...t,
                                          prompts: [
                                            ...t.prompts,
                                            {
                                              id: generatePromptId(),
                                              text: newPromptText.trim(),
                                              category: "brand",
                                            },
                                          ],
                                        }
                                      : t
                                  )
                                );
                                setNewPromptText("");
                                setAddingPromptToTopic(null);
                              }
                            }}
                            className="p-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5]"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setNewPromptText("");
                              setAddingPromptToTopic(null);
                            }}
                            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingPromptToTopic(topic.name)}
                        className="w-full px-4 py-3 pl-10 text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Prompt
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add Topic Row */}
            {isAddingNewTopic ? (
              <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="Enter topic name..."
                    autoFocus
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTopicName.trim()) {
                        setTopicsWithPrompts([
                          ...topicsWithPrompts,
                          {
                            name: newTopicName.trim(),
                            description: "Custom topic",
                            prompts: [],
                            isExpanded: true,
                          },
                        ]);
                        setAddingPromptToTopic(newTopicName.trim());
                        setNewTopicName("");
                        setIsAddingNewTopic(false);
                      } else if (e.key === "Escape") {
                        setNewTopicName("");
                        setIsAddingNewTopic(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newTopicName.trim()) {
                        setTopicsWithPrompts([
                          ...topicsWithPrompts,
                          {
                            name: newTopicName.trim(),
                            description: "Custom topic",
                            prompts: [],
                            isExpanded: true,
                          },
                        ]);
                        setAddingPromptToTopic(newTopicName.trim());
                        setNewTopicName("");
                        setIsAddingNewTopic(false);
                      }
                    }}
                    className="p-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5]"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setNewTopicName("");
                      setIsAddingNewTopic(false);
                    }}
                    className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingNewTopic(true)}
                className="px-4 py-3 text-left text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Topic
              </button>
            )}
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Ready to run your prompts on these platforms?
              </h2>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 mb-6">
              You have {totalPromptCount} prompts total in your list.
            </p>

            {/* Platform Selection */}
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 mb-6">
              <div className="flex items-center gap-3 px-4 py-3">
                <img
                  src="https://www.google.com/s2/favicons?domain=chat.openai.com&sz=32"
                  alt="ChatGPT"
                  className="w-8 h-8 rounded-md"
                />
                <span className="text-gray-900 font-medium">ChatGPT</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <img
                  src="https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32"
                  alt="Perplexity"
                  className="w-8 h-8 rounded-md"
                />
                <span className="text-gray-900 font-medium">Perplexity</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <img
                  src="https://www.google.com/s2/favicons?domain=google.com&sz=32"
                  alt="Google"
                  className="w-8 h-8 rounded-md"
                />
                <span className="text-gray-900 font-medium">
                  Google AI Overviews
                </span>
              </div>
            </div>

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmittingPrompts}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPrompts}
                disabled={isSubmittingPrompts}
                className="flex-1 px-4 py-2.5 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#4f46e5] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingPrompts ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Submit Prompts (${totalPromptCount})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {showAddPromptDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowAddPromptDropdown(false);
          }}
        />
      )}
    </div>
  );
}
