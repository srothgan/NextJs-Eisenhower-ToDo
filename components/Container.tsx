"use client"
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { signOut, useSession } from "next-auth/react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  TouchSensor,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import SortableContainer from "./SortableContainer";
import Item from "./Item";
import { FaRegSave, FaPlus, FaCheckCircle   } from "react-icons/fa";
import SortableItem from "./SortableItem";

interface TaskItem {
  id: string;
  name: string;
  date: string;
  note: string;
}

interface Items {
  [key: string]: TaskItem[];
}

const Container = () => {
 
  const [items, setItems] = useState<Items>({
    container1: [],
    container2: [],
    container3: [],
    container4: [],
    container5: [],
  });

  const [activeId, setActiveId] = useState<UniqueIdentifier>();
  const { data: session, status } = useSession();
  // Find the active item based on the activeId
  const activeItem = activeId
    ? Object.values(items)
        .flat()
        .find((item) => item.id === activeId)
    : null;

  const [newTask, setNewTask] = useState("");
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false); 

  const loadTasks = async () => {
    if (!session?.user?.id) {
      alert("User ID is not available. Try in a few seconds again.");
      return;
    }
  
    try {
      const response = await fetch(`/api/task?id=${session.user.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
  
      const fetchedData = await response.json();
  
      // Check if fetchedData contains a `tasks` property
      const fetchedTasks = Array.isArray(fetchedData) ? fetchedData : fetchedData.tasks;
      
      if (!Array.isArray(fetchedTasks)) {
        throw new Error("Invalid task data format");
      }
      
      for (const task of fetchedTasks) {
        const newItem = {
          id: task._id,
          name: task.name,
          date: task.date,
          note: task.note, // You can modify this as needed
        };
        setItems((prevItems) => ({
          ...prevItems,                  // Spread previous state
          [task.container]: [...prevItems[task.container], newItem],  // Add the new item to the appropriate container
        }));
      }
  
      
    } catch (error) {
      alert("Error loading tasks:");
    } finally {
      setLoading(false);
    }
  };
  
  

  // Function to add a new task
  const addTask = (event) => {
    event.preventDefault();  // Prevent page reload
    if (!newTask || !newNote) return;  // Check if both fields are filled
    
    // Generate a new ID (using a random string or increment logic)
    const newId = generateUniqueId(items);

    // Get the current date
    const currentDate = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

    // Add the new task to container1
    setItems((prevItems) => {
      return {
        ...prevItems,
        container1: [
          ...prevItems.container1,
          {
            id: newId,
            name: newTask,
            date: currentDate,
            note: newNote
          }
        ]
      };
    });

    // Reset the input fields
    setNewTask('');
    setNewNote('');
  };

  const generateUniqueId = (items: Items): string => {
    let newId: string;
    
    // Collect all existing IDs
    const allIds = Object.values(items)
      .flat()
      .map((item: TaskItem) => item.id);
    
    // Loop until we find a unique ID
    do {
      newId = Math.random().toString(36).substr(2, 9);
    } while (allIds.includes(newId));
  
    return newId;
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

 
  const findContainer = (id: UniqueIdentifier) => {
    // First check if the id matches a container key itself
    if (id in items) {
      return id;
    }
    
    // Search through the containers to find the one that contains an item with the matching id
    return Object.keys(items).find((key: string) => 
      items[key].some(item => item.id === id.toString()) // Compare id of items
    );
  };

 
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id.toString();
  
    // Find the container where the dragged item is located
    const containerId = findContainer(id);
  
    // Find the dragged item by id
    if (containerId) {
      const draggedItem = items[containerId].find((item) => item.id === id);
      setActiveId(draggedItem?.id || null); // Store the active item’s id
    }
  };
  
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    const activeId = active.id.toString();
    const overId = over?.id?.toString();
  
    if (!overId) return;
  
    // Find which containers the active and over items are in
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
  
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }
  
    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
  
      // Find the indexes of the active and over items based on their id
      const activeIndex = activeItems.findIndex(item => item.id === activeId);
      const overIndex = overItems.findIndex(item => item.id === overId);
  
      if (activeIndex === -1 || overIndex === -1) return prev;
  
      let newIndex: number;
  
      // Check if we are moving over the container itself (moving to an empty container)
      if (overId in prev) {
        newIndex = overItems.length; // Move to the end of the target container
      } else {
        const isBelowLastItem = over && overIndex === overItems.length - 1;
        const modifier = isBelowLastItem ? 1 : 0;
  
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
      }
  
      // Remove the active item from the current container
      const updatedActiveItems = activeItems.filter(item => item.id !== activeId);
  
      // Add the active item to the new container at the correct position
      const updatedOverItems = [
        ...overItems.slice(0, newIndex),
        activeItems[activeIndex], // Insert the active item
        ...overItems.slice(newIndex),
      ];
  
      // Return the updated items
      return {
        ...prev,
        [activeContainer]: updatedActiveItems, // Update the active container
        [overContainer]: updatedOverItems,     // Update the target container
      };
    });
  };
  

 
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    const activeId = active.id.toString();
    const overId = over?.id?.toString();
  
    // If no `overId` or both IDs are missing, return early
    if (!overId || !activeId) return;
  
    // Find the containers for the active and over items
    const activeContainer = findContainer(activeId); // Where the item started
    const overContainer = findContainer(overId); // Where the item is dragged over
  
    // If containers are different or not found, move the item between containers
    if (!activeContainer || !overContainer || activeContainer !== overContainer) {
      setItems((prevItems) => {
        const activeIndex = prevItems[activeContainer].findIndex(item => item.id === activeId);
        const activeItem = prevItems[activeContainer][activeIndex];
  
        // Remove the item from the active container
        const updatedActiveItems = prevItems[activeContainer].filter((item) => item.id !== activeId);
  
        // Add the item to the new container
        const updatedOverItems = [...prevItems[overContainer], activeItem];
  
        return {
          ...prevItems,
          [activeContainer]: updatedActiveItems, // Update the active container
          [overContainer]: updatedOverItems, // Update the container where the item is moved
        };
      });
    } else {
      // If the item is dropped in the same container, reorder the items
      const activeIndex = items[activeContainer].findIndex(item => item.id === activeId);
      const overIndex = items[overContainer].findIndex(item => item.id === overId);
  
      if (activeIndex !== overIndex) {
        setItems((prevItems) => ({
          ...prevItems,
          [overContainer]: arrayMove(
            prevItems[overContainer], // Move items within the same container
            activeIndex,
            overIndex
          ),
        }));
      }
    }
  
    setActiveId(undefined); // Clear activeId after the drag ends
  };
  
  const deleteItem = (id: string) => {
    setItems((prevItems) => {
      const containerKey = findContainer(id);  // Find which container the item belongs to
      if (!containerKey) return prevItems;
  
      // Filter out the item with the given ID
      const updatedContainer = prevItems[containerKey].filter(item => item.id !== id);
  
      return {
        ...prevItems,
        [containerKey]: updatedContainer,  // Update the container with the filtered items
      };
    });
  };
  const saveAllTasks = async (userId) => {
    const deleteResponse = await fetch(`/api/task?id=${userId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!deleteResponse.ok) {
        throw new Error("Failed to delete existing tasks");
    }
    // Iterate over each container key in the items object
    for (const containerKey in items) {
        if (Object.hasOwnProperty.call(items, containerKey)) {
            // Access the array of tasks within the current container
            const tasks = items[containerKey];
            // Iterate over each task within the current container
            for (const task of tasks) {
                try {
                    // Construct the request to save the task
                    const response = await fetch("/api/task", {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: task.name,
                            note: task.note,
                            date: task.date,
                            userId: userId,  // User ID from session or passed explicitly
                            container: containerKey  // Use the key as the container ID
                        }),
                    });

                    const result = await response.json();
                    // Check the response status and handle errors
                    if (!response.ok) {
                        throw new Error(result.message || "Failed to save task");
                    }
                } catch (error) {
                    
                    alert('Error saving tasks.');
                }
            }
        }
    }
    // Set success state to true and hide it after 3 seconds
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);  // 3 seconds
};
useEffect(() => {
  if (status === "authenticated") {
    loadTasks();
  }
}, [status])

if (loading) {
  return <div>Loading tasks...</div>;
}  
return (
    <div className="flex flex-col w-full p-4">
      <div className='w-full flex justify-end p-2'>
        <button onClick={() => {
    if (session?.user?.id) {
      saveAllTasks(session.user.id);
    } else {
      alert("User ID is not available");
    }
  }} type="button" className="w-full md:w-fit bg-blue-500 text-white p-2 rounded-lg border-2 border-gray-300 flex items-center justify-center gap-2">
          {saveSuccess ? (
            <>
              <p>Saved</p> <FaCheckCircle />
            </>
          ) : (
            <>
              <p>Save Tasks</p> <FaRegSave />
            </>
          )}
        </button>
      </div>
      <div className='p-2 block'>
        <h3 className="text-xl font-bold text-center">Create new Task</h3>
        <form onSubmit={addTask} className="w-full flex flex-col md:flex-row gap-4 pt-2">
            <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Enter a name"
                className="w-full p-3 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter a note"
              className="w-full p-3 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button type="submit" className="w-full md:w-fit bg-blue-500 text-white p-2 rounded-lg border-2 border-gray-300 flex items-center justify-center">
              <FaPlus/>
            </button>
        </form>
      </div>  
      <div className='w-full block md:flex'>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* SortableContainer */}
        <div className='w-full md:w-1/3 block p-2 '>
            <SortableContainer
            id="container1"
            items={items.container1}
            label="Unassigned"
            color="bg-white"
            height="h-[250px] md:h-[550px]"
            deleteItem={deleteItem}  
            />
        </div>
        <div className='w-full md:w-2/3 flex flex-col md:grid grid-cols-2 p-2 rounded-xl'>
            <SortableContainer
            id="container2"
            label="Important, Not Urgent"
            items={items.container2 }
            color="bg-modern-orange"
            height=" h-[250px]"
            deleteItem={deleteItem}  
            />
            <SortableContainer
            id="container3"
            label="Important, Urgent"
            items={items.container3 }
            color="bg-modern-red"
            height=" h-[250px]"
            deleteItem={deleteItem}  
            />
            <SortableContainer
            id="container4"
            label="Not Important, Not Urgent"
            items={items.container4 }
            color="bg-modern-green"
            height=" h-[250px]"
            deleteItem={deleteItem}  
            />
            <SortableContainer
            id="container5"
            label="Not Important, Urgent"
            items={items.container5}
            color="bg-modern-blue"
            height=" h-[250px]"
            deleteItem={deleteItem}  
            />
        </div>
        {/* DragOverlay */}
        <DragOverlay>
          {activeItem ? (
            <SortableItem
              id={activeItem.id}
              name={activeItem.name}
              note={activeItem.note}
              date={activeItem.date}
              deleteItem={deleteItem}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      </div>
    </div>
  );
};

export default Container;