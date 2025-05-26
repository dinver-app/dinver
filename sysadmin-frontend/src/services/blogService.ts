import { apiClient } from "./authService";

// Blog Posts
export const getBlogs = async () => {
  const response = await apiClient.get("api/sysadmin/blogs");
  return response.data.blogs;
};

export const getBlogById = async (id: string) => {
  const response = await apiClient.get(`api/sysadmin/blogs/${id}`);
  return response.data;
};

export const createBlog = async (blogData: FormData) => {
  const response = await apiClient.post("api/sysadmin/blogs", blogData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const updateBlog = async (id: string, blogData: FormData) => {
  const response = await apiClient.put(`api/sysadmin/blogs/${id}`, blogData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteBlog = async (id: string) => {
  const response = await apiClient.delete(`api/sysadmin/blogs/${id}`);
  return response.data;
};

// Blog Users
export const getBlogUsers = async () => {
  const response = await apiClient.get("api/sysadmin/blog-users");
  return response.data.blogUsers;
};

export const getBlogUserById = async (id: string) => {
  const response = await apiClient.get(`api/sysadmin/blog-users/${id}`);
  return response.data;
};

export const createBlogUser = async (userData: FormData) => {
  const response = await apiClient.post("api/sysadmin/blog-users", userData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const updateBlogUser = async (id: string, userData: FormData) => {
  const response = await apiClient.put(
    `api/sysadmin/blog-users/${id}`,
    userData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const deleteBlogUser = async (id: string) => {
  const response = await apiClient.delete(`api/sysadmin/blog-users/${id}`);
  return response.data;
};

export const toggleBlogUserActive = async (id: string) => {
  const response = await apiClient.put(
    `api/sysadmin/blog-users/${id}/toggle-active`
  );
  return response.data;
};
