import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { projectsApi } from "@/api/projectsApi";
import { getErrorMessage } from "@/api/client";
import type { CreateProjectRequest, Project, UpdateProjectRequest } from "@/types/chat.types";

interface ProjectContextValue {
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
  clearError: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await projectsApi.list({ limit: 100 });
      setProjects(response.projects);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data: CreateProjectRequest): Promise<Project> => {
    setError(null);
    try {
      const project = await projectsApi.create(data);
      setProjects((prev) => [project, ...prev]);
      return project;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

  const updateProject = useCallback(
    async (id: string, data: UpdateProjectRequest): Promise<Project> => {
      setError(null);
      try {
        const updated = await projectsApi.update(id, data);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        return updated;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      }
    },
    []
  );

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

  const getProjectById = useCallback(
    (id: string): Project | undefined => projects.find((p) => p.id === id),
    [projects]
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  const value = useMemo(
    () => ({
      projects,
      isLoading,
      error,
      fetchProjects,
      createProject,
      updateProject,
      deleteProject,
      getProjectById,
      clearError,
    }),
    [
      projects,
      isLoading,
      error,
      fetchProjects,
      createProject,
      updateProject,
      deleteProject,
      getProjectById,
      clearError,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
}
