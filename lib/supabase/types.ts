// These types mirror supabase/schema.sql. Once your project is linked, you
// can regenerate this file automatically with:
//
//   npx supabase gen types typescript --project-id <your-project-ref> > lib/supabase/types.ts
//
// Hand-written for now so the app compiles without a live Supabase project.

export type UserRole = "owner" | "admin" | "member" | "viewer";
export type IdeaStatus = "discussion" | "approved" | "rejected";
export type VoteChoice = "approve" | "reject" | "neutral";
export type TaskStatus = "todo" | "in_progress" | "review" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      ideas: {
        Row: {
          id: string;
          title: string;
          problem: string | null;
          description: string | null;
          solution: string | null;
          target_audience: string | null;
          business_model: string | null;
          market_size: string | null;
          competitors: string | null;
          technology_required: string | null;
          estimated_cost: string | null;
          category: string;
          tags: string[];
          priority: string;
          status: IdeaStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ideas"]["Row"]> & {
          title: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["ideas"]["Row"]>;
      };
      idea_votes: {
        Row: {
          id: string;
          idea_id: string;
          user_id: string;
          choice: VoteChoice;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          user_id: string;
          choice: VoteChoice;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["idea_votes"]["Row"]>;
      };
      idea_comments: {
        Row: {
          id: string;
          idea_id: string;
          user_id: string;
          parent_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          user_id: string;
          parent_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["idea_comments"]["Row"]>;
      };
      workspaces: {
        Row: {
          id: string;
          idea_id: string;
          name: string;
          created_at: string;
        };
        Insert: { id?: string; idea_id: string; name: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Row"]>;
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: UserRole;
          joined_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: UserRole;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspace_members"]["Row"]>;
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          assignee_id: string | null;
          priority: TaskPriority;
          status: TaskStatus;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          workspace_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          folder: string;
          storage_path: string;
          size_bytes: number | null;
          version: number;
          uploaded_by: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          workspace_id: string;
          name: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
      };
      messages: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: { id?: string; workspace_id: string; user_id: string; body: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
      milestones: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          sort_order: number;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["milestones"]["Row"]> & {
          workspace_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["milestones"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          body: string;
          link: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          user_id: string;
          type: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      idea_status: IdeaStatus;
      vote_choice: VoteChoice;
      task_status: TaskStatus;
      task_priority: TaskPriority;
    };
  };
}
