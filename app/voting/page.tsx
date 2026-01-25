"use client"

import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/event-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Vote, CheckCircle2, Loader2, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Footer } from "@/components/footer"
import { ShareModal } from "@/components/share-modal"

export default function VotingPage() {
  const { event } = useEvent()
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [polls, setPolls] = useState<any[]>([])
  const [userVotes, setUserVotes] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [votingFinished, setVotingFinished] = useState(false)

  useEffect(() => {
    if (event?.id) {
      fetchPolls()
      if (user) {
        fetchUserVotes()
      }
    }
  }, [event?.id, user])

  const fetchPolls = async () => {
    try {
      const response = await fetch(`/api/events/${event.id}/voting/polls`)
      const data = await response.json()

      const allPolls = data.polls || []
      const now = new Date()
      const hasFinishedPolls = allPolls.some((p: any) => p.end_date && new Date(p.end_date) < now)
      setVotingFinished(hasFinishedPolls)

      const activePolls = allPolls.filter((p: any) => p.is_active)

      const pollsWithItems = await Promise.all(
        activePolls.map(async (poll: any) => {
          const detailsRes = await fetch(`/api/events/${event.id}/voting/polls/${poll.id}`)
          const details = await detailsRes.json()
          return { ...poll, items: details.items || [] }
        }),
      )

      setPolls(pollsWithItems)
    } catch (error) {
      console.error("[v0] Error fetching polls:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserVotes = async () => {
    try {
      const response = await fetch(`/api/events/${event.id}/voting/vote`)
      const data = await response.json()

      const votesMap: Record<string, string> = {}
      data.votes.forEach((vote: any) => {
        votesMap[vote.poll_id] = vote.item_id
      })
      setUserVotes(votesMap)
    } catch (error) {
      console.error("[v0] Error fetching user votes:", error)
    }
  }

  const castVote = async (pollId: string, itemId: string) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setIsVoting(pollId)
    try {
      const response = await fetch(`/api/events/${event.id}/voting/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poll_id: pollId, item_id: itemId }),
      })

      if (!response.ok) throw new Error("Failed to cast vote")

      const data = await response.json()
      setUserVotes({ ...userVotes, [pollId]: itemId })

      toast({
        title: "Vote Cast!",
        description: data.message || "Your vote has been recorded",
      })

      fetchPolls()
    } catch (error) {
      console.error("[v0] Error casting vote:", error)
      toast({
        title: "Error",
        description: "Failed to cast vote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVoting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (polls.length === 0 && !votingFinished) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <Vote className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">No Active Polls</h1>
            <p className="text-muted-foreground">There are no voting polls available at this time.</p>
            <Button asChild>
              <a href="/">Return Home</a>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h1 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">Cast Your Vote</h1>
              <p className="mt-4 text-pretty text-lg text-muted-foreground mx-auto max-w-2xl">
                Help us make decisions for our community. Your vote matters!
              </p>
              <div className="flex justify-center mt-6">
                <Button onClick={() => setShowShareModal(true)} variant="outline" size="lg">
                  <Share2 className="mr-2 h-5 w-5" />
                  Share Voting Page
                </Button>
              </div>
            </div>

            {votingFinished && (
              <div className="mx-auto max-w-5xl mb-12">
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                      Final Results
                    </CardTitle>
                    <CardDescription>Voting has ended. Here are the final results for all polls.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {polls.map((poll) => {
                        const totalVotes = poll.items.reduce(
                          (sum: number, item: any) => sum + (item.vote_count || 0),
                          0,
                        )
                        const sortedItems = [...poll.items].sort(
                          (a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0),
                        )

                        return (
                          <div key={poll.id} className="space-y-4">
                            <h3 className="font-semibold text-lg">{poll.title}</h3>
                            <div className="space-y-3">
                              {sortedItems.map((item: any, index: number) => {
                                const percentage = totalVotes > 0 ? ((item.vote_count || 0) / totalVotes) * 100 : 0
                                return (
                                  <div key={item.id} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">{index + 1}.</span>
                                        <span>{item.title}</span>
                                      </div>
                                      <span className="font-bold text-primary">{item.vote_count || 0} votes</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${Math.min(100, percentage)}%` }}
                                      />
                                    </div>
                                    <div className="text-xs text-muted-foreground text-right">
                                      {percentage.toFixed(1)}%
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {totalVotes === 0 && <p className="text-sm text-muted-foreground">No votes recorded</p>}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="mx-auto max-w-5xl space-y-12">
              {polls.map((poll) => (
                <Card key={poll.id}>
                  <CardHeader>
                    <CardTitle className="text-2xl">{poll.title}</CardTitle>
                    {poll.description && <CardDescription className="text-base">{poll.description}</CardDescription>}
                    {userVotes[poll.id] && (
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium mt-2">
                        <CheckCircle2 className="h-4 w-4" />
                        You've voted! You can change your vote anytime.
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {poll.items.map((item: any) => {
                        const isSelected = userVotes[poll.id] === item.id
                        const isVotingThis = isVoting === poll.id

                        return (
                          <button
                            key={item.id}
                            onClick={() => castVote(poll.id, item.id)}
                            disabled={isVotingThis}
                            className={cn(
                              "relative group rounded-lg border-2 transition-all text-left shadow-sm",
                              "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                              "bg-card dark:bg-[#1a1a1a] dark:border-gray-800",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-muted hover:border-primary/50",
                            )}
                          >
                            {item.image_url && (
                              <div className="relative w-full aspect-video rounded-t-md overflow-hidden bg-muted/20">
                                <img
                                  src={item.image_url || "/placeholder.svg"}
                                  alt={item.title}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-12 w-12 text-primary" />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="p-4 space-y-2">
                              <h3 className="font-semibold text-lg dark:text-white">{item.title}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground dark:text-gray-300">{item.description}</p>
                              )}
                              <div className="flex items-center justify-between pt-2">
                                {!poll.blind_voting && (
                                  <span className="text-sm text-muted-foreground dark:text-gray-400">
                                    {item.vote_count || 0} votes
                                  </span>
                                )}
                                {poll.blind_voting && (
                                  <span className="text-sm text-muted-foreground invisible">Hidden</span>
                                )}
                                {isSelected && (
                                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Your Vote
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        url={typeof window !== "undefined" ? window.location.href : ""}
        title="Vote Now!"
        description="Help us make decisions for our community"
      />
    </div>
  )
}
