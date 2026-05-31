useEffect(() => {
  if (!db) return;

  const q = query(
    collection(db, 'publicWardrobeItems'),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toMillis()
            : Date.now(),
      };
    });

    setCloset(items);

    startTransition(async () => {
      try {
        // Payload Shredder
        const lightweightCloset = items.slice(0, 60).map((item: any) => ({
          id: item.id,
          itemName: item.itemName,
          itemType: item.itemType || 'unknown',
          color: item.color || 'unknown',
          imageUrl: item.imageUrl || item.image || item.url || null 
        }));

        // 🔥 THE PIVOT: Standard JSON fetch instead of Server Action
        const response = await fetch('/api/get-daily-outfits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ closetItems: lightweightCloset }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const recs = await response.json();
        setRecommendations(recs);

      } catch (error) {
        console.error("Failed to fetch outfits:", error);
      } finally {
        setDataLoaded(true);
      }
    });
  });

  return () => unsubscribe();
}, []);