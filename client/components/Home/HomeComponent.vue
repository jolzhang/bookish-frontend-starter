<script setup lang="ts">
// const currentTab = ref('Home')
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";
import { ref } from "vue";

const { currentUsername } = storeToRefs(useUserStore());

const currentTab = ref("")
