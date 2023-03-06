import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/create",
      name: "create",
      component: () => import("../views/CreateView.vue"),
    },
    {
      path: "/session/:sessionId/participant/:participationKey",
      name: "participate",
      component: () => import("../views/ParticipateView.vue"),
    }
  ],
});

export default router;
